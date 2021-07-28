import { ethers } from 'ethers';
import starkbankType from 'starkbank';
import delay from 'delay';
import EthCrypto from 'eth-crypto';

import logger from '../logger';
import { PaymentRequest, SyncBlock } from '../models';
import { IPaymentRequest } from '../models/payment-request';
import { BrcodePayment, PaymentRequestStatus, Engine } from '../types';
import { isPayable } from '../controllers/amount-required';
import { chainInfo } from '../utils';

/**
 * Returns an engine that watches the blockchain for native currency transfers to a wallet and, if valid, creates a payment for the corresponding brcode.
 * @param starkbank Authenticated starbank instance.
 * @param provider JsonRpcProvider to watch for transfers.
 * @param paymentNotifier The payment notifier contract.
 * @returns Payment request engine
 */
export default async function nativePayment(
  starkbank: starkbankType,
  provider: ethers.providers.JsonRpcProvider,
  paymentNotifier: ethers.Contract
): Promise<Engine> {
  let shutdownRequested = false;
  let running = false;
  const { chainId } = await provider.getNetwork();
  const SYNC_BLOCK_KEY = `syncblock-native-${chainId}`;

  return {
    start: async function start() {
      running = true;
      let syncBlock = await SyncBlock.findOne({ id: SYNC_BLOCK_KEY });
      if (!syncBlock) {
        // Engine starting for the very first time.
        syncBlock = new SyncBlock({
          id: SYNC_BLOCK_KEY,
          lastBlock: await provider.getBlockNumber()
        });
        await syncBlock.save();
      }

      const blockInterval = 1000;
      const interval = {
        fromBlock: syncBlock.lastBlock,
        toBlock: syncBlock.lastBlock + blockInterval
      };

      logger.info(`Starting interval: ${JSON.stringify(interval)}`);
      while (!shutdownRequested) {
        running = true;
        logger.info(`Checking incoming transfers ${JSON.stringify(interval)}`);
        logger.info(`Current blocknum ${await provider.getBlockNumber()}`);

        const paymentNotificationEvents = await provider.getLogs({
          ...paymentNotifier.filters.PaymentReceived(),
          ...interval
        });

        const processesedRequests: IPaymentRequest[] = [];
        await Promise.allSettled(
          paymentNotificationEvents.map(async (paymentNotificationEvent) => {
            try {
              const parsedLog = paymentNotifier.interface.parseLog(
                paymentNotificationEvent
              );
              const payerAddr = parsedLog.args._payer;
              const brcode = await EthCrypto.decryptWithPrivateKey(
                process.env.DECRYPTOR_KEY,
                EthCrypto.cipher.parse(parsedLog.args._data)
              );

              // TODO: Need to parse this in BRL.
              const rate = parsedLog.args._agreedBasePrice;
              const paymentRequest = new PaymentRequest({
                txHash: paymentNotificationEvent.transactionHash,
                brcode,
                payerAddr,
                coin: 'native',
                rate,
                status: PaymentRequestStatus.confirmed,
                chainId: chainId
              });
              await paymentRequest.save();

              const previewOrError = await isPayable(starkbank, brcode);

              // Validate invoice.
              if (typeof previewOrError === 'string') {
                // TODO: If it cannot be paid, return the funds.
                paymentRequest.status = PaymentRequestStatus.failed;
                paymentRequest.failReason = previewOrError;
                paymentRequest.save();
                return;
              }

              paymentRequest.receiverTaxId = previewOrError.taxId;
              paymentRequest.description = previewOrError.description;
              paymentRequest.brcodeAmount = previewOrError.amount;
              await paymentRequest.save();

              // TODO: Check if amount paid covers amount required on price agreed.

              processesedRequests.push(paymentRequest);
              const payment = {
                brcode: paymentRequest.brcode,
                taxId: paymentRequest.receiverTaxId,
                description: paymentRequest.description || 'Cipay payment',
                amount: paymentRequest.brcodeAmount
              };
              const brcodePayment: BrcodePayment = (
                await starkbank.brcodePayment.create([payment])
              )[0];

              paymentRequest.status = PaymentRequestStatus.processing;
              paymentRequest.starkbankPaymentId = brcodePayment.id;
              paymentRequest.brcodeStatus = 'created';

              await paymentRequest.save();
            } catch (error) {
              logger.error({
                level: 'error',
                message: `erc20Payment: Error fetching payment for txHash ${paymentNotificationEvent.transactionHash}`,
                error
              });
            }
          })
        );

        const eventLastBlock = paymentNotificationEvents.reduce(
          (acc, curr) => (curr.blockNumber > acc ? curr.blockNumber : acc),
          0
        );
        const currentblockNumber = await provider.getBlockNumber();
        interval.fromBlock =
          eventLastBlock > interval.toBlock ? eventLastBlock : interval.toBlock;
        interval.fromBlock =
          currentblockNumber < interval.fromBlock
            ? currentblockNumber
            : interval.fromBlock;
        interval.fromBlock++;

        interval.toBlock = interval.fromBlock + blockInterval;
        syncBlock.lastBlock = interval.fromBlock - 1;
        syncBlock = await syncBlock.save();
        await delay(Number(process.env.PAYMENT_ENGINES_DELAY_MILLISECONDS));
        running = false;
      }
    },
    stop: function stop() {
      shutdownRequested = true;
    },
    isRunning: function isRunning() {
      return running;
    }
  };
}

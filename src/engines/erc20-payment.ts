import { ethers } from 'ethers';
import starkbankType from 'starkbank';
import delay from 'delay';

import logger from '../logger';
import { PaymentRequest, SyncBlock } from '../models';
import { IPaymentRequest } from '../models/payment-request';
import { BrcodePayment, PaymentRequestStatus, Engine } from '../types';

/**
 * Returns an engine that watches the blockchain for erc20 transfers to a wallet and, if valid, creates a payment for the corresponding brcode.
 * @param starkbank Authenticated starbank instance.
 * @param provider JsonRpcProvider to watch for transfer logs.
 * @param erc20 The erc20 token contract this engine handles.
 * @returns Payment request engine
 */
export default function erc20Payment(
  starkbank: starkbankType,
  provider: ethers.providers.JsonRpcProvider,
  erc20: ethers.Contract
): Engine {
  let shutdownRequested = false;
  let running = false;
  const SYNC_BLOCK_KEY = `syncblock-${erc20.address}`;

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
        logger.info(`Checking logs ${JSON.stringify(interval)}`);
        logger.info(`Current blocknum ${await provider.getBlockNumber()}`);
        const transferEvents = await provider.getLogs({
          ...erc20.filters.Transfer(null, process.env.WALLET_ADDRESS),
          ...interval
        });

        const processesedRequests: IPaymentRequest[] = [];
        await Promise.allSettled(
          transferEvents.map(async (transferEvent) => {
            try {
              const paymentRequest = await PaymentRequest.findOne({
                txHash: transferEvent.transactionHash
              });

              if (!paymentRequest) {
                logger.warn(
                  `erc20Payment: No corresponding entry for deposit found in db, ignoring. TxHash: ${transferEvent.transactionHash}`
                );
                return;
              }

              if (
                String(paymentRequest.status) !==
                String(PaymentRequestStatus.submitted)
              ) {
                logger.warn(
                  `erc20Payment: Payment request in an invalid state, ignoring. Status: ${paymentRequest.status} expected ${PaymentRequestStatus.submitted}, id: ${paymentRequest.id}`
                );
                return;
              }

              paymentRequest.status = PaymentRequestStatus.confirmed;
              await paymentRequest.save();

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
                message: `erc20Payment: Error fetching payment for txHash ${transferEvent.transactionHash}`,
                error
              });
            }
          })
        );

        const eventLastBlock = transferEvents.reduce(
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

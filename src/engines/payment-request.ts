import { ethers } from 'ethers';
import starkbankType from 'starkbank';
import delay from 'delay';

import logger from '../logger';
import { PaymentRequest, SyncBlock } from '../models';
import { IPaymentRequest } from '../models/payment-request';
import { BrcodePayment, PaymentRequestStatus, Engine } from '../types';
import { ACCEPTED_TOKEN_ADDRESSES } from '../utils';

/**
 * Returns an engine that watches the blockchain for erc20 transfers to a wallet and, if valid, creates a payment for the corresponding brcode.
 * @param starkbank Authenticated starbank instance.
 * @param provider JsonRpcProvider to watch for transfer logs.
 * @param erc20 The erc20 token contract this engine handles.
 * @param wallet The wallet to watch for transfers to.
 * @returns Payment request engine
 */
export default function paymentRequestEngine(
  starkbank: starkbankType,
  provider: ethers.providers.JsonRpcProvider,
  erc20: ethers.Contract,
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
          lastBlock: await provider.getBlockNumber(),
        });
        await syncBlock.save();
      }

      const intervalLength = 10000;
      const interval = {
        fromBlock: syncBlock.lastBlock,
        toBlock: syncBlock.lastBlock + intervalLength
      };

      logger.info(`Starting interval: ${JSON.stringify(interval)}`);
      while (!shutdownRequested) {
        running = true;

        try {
          logger.info(`Checking logs ${JSON.stringify(interval)}`);
          logger.info(`Current blocknum ${await provider.getBlockNumber()}`);
          const transferEvents = (
            await provider.getLogs({
              ...erc20.filters.Transfer(null, process.env.WALLET_ADDRESS),
              ...interval,
            })
          ).filter(
            (e) =>
              e.address.toLowerCase() ===
                process.env.META_TX_PROXY_ADDRESS.toLowerCase() ||
              ACCEPTED_TOKEN_ADDRESSES.includes(e.address),
          );

          const processesedRequests: IPaymentRequest[] = [];
          await Promise.allSettled(
            transferEvents.map(async (transferEvent) => {
              try {
                const paymentRequest = await PaymentRequest.findOne({
                  txHash: transferEvent.transactionHash,
                });

                if (!paymentRequest) {
                  logger.warn(
                    `PaymentRequestEngine: No corresponding entry for deposit found in db, ignoring. TxHash: ${transferEvent.transactionHash}`,
                  );
                  return;
                }

                if (
                  String(paymentRequest.status) !==
                  String(PaymentRequestStatus.submitted)
                ) {
                  logger.warn(
                    `PaymentRequestEngine: Payment request in an invalid state, ignoring. Status: ${paymentRequest.status} expected ${PaymentRequestStatus.submitted}, id: ${paymentRequest.id}`,
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
                  amount: paymentRequest.brcodeAmount,
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
                  message: `PaymentRequestEngine: Error fetching payment for txHash ${transferEvent.transactionHash}`,
                  error,
                });
              }
            }),
          );

          // We select the next starting block as follows:
          // - If the blockchain caught up or passed interval.toBlock
          //   we set the starting block to be interval.toBlock.
          // - Otherwise, we check if there were returned events for the current
          //   interval. If there were, we set the starting block to be the one
          //   just after the block where the last event was emitted.
          // - Otherwise, we keep the current block interval.
          const currentBlockNumber = await provider.getBlockNumber();
          if (currentBlockNumber >= interval.toBlock) interval.fromBlock = interval.toBlock;
          else if (transferEvents.length > 0) {
            interval.fromBlock = transferEvents
              .map(({ blockNumber }) => blockNumber)
              .reduce((a, b) => Math.max(a, b), 0) + 1;
          }

          interval.toBlock = interval.fromBlock + intervalLength;

          syncBlock.lastBlock = interval.fromBlock;
          syncBlock = await syncBlock.save();
          await delay(Number(process.env.PAYMENT_ENGINE_DELAY_MILLISECONDS));
        } catch (error) {
          logger.error(error.message)
        } finally {
          running = false;
        }
      }
    },
    stop: function stop() {
      shutdownRequested = true;
    },
    isRunning: function isRunning() {
      return running;
    },
  };
}

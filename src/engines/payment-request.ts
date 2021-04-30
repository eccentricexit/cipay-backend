import { ethers } from 'ethers';
import starkbankType from 'starkbank';
import logger from '../logger';

import { PaymentRequest, SyncBlock } from '../models';
import { IPaymentRequest } from '../models/payment-request';
import { BrcodePayment, PaymentRequestStatus, Engine } from '../types';

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
  wallet: string,
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

      const blockInterval = 50;
      const interval = {
        fromBlock: syncBlock.lastBlock,
        toBlock: syncBlock.lastBlock + blockInterval,
      };

      while (!shutdownRequested) {
        running = true;
        const transferEvents = await provider.getLogs({
          ...erc20.filters.Transfer(null, wallet),
          ...interval,
        });

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

              if (paymentRequest.status !== PaymentRequestStatus.created) {
                logger.warn(
                  `PaymentRequestEngine: Payment request in an invalid state, ignoring. Status: ${paymentRequest.status}, id: ${paymentRequest.id}`,
                );
                return;
              }

              paymentRequest.status = PaymentRequestStatus.confirmed;
              await paymentRequest.save();

              processesedRequests.push(paymentRequest);
              const brcodePayment: BrcodePayment = (
                await starkbank.brcodePayment.create([
                  {
                    brcode: paymentRequest.brcode,
                    taxId: paymentRequest.receiverTaxId,
                    description: paymentRequest.description,
                    amount: paymentRequest.brcodeAmount,
                  },
                ])
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

        const currBlock = await provider.getBlockNumber();
        if (currBlock > interval.toBlock) {
          syncBlock.lastBlock = interval.toBlock;
          interval.fromBlock = interval.toBlock + 1;
        } else {
          syncBlock.lastBlock = currBlock;
          interval.fromBlock = currBlock;
        }
        interval.toBlock = interval.fromBlock + blockInterval;
        await syncBlock.save();
        running = false;
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

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
  wallet: string,
  metaTxProxy: ethers.Contract,
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

      logger.info(`Starting interval: ${JSON.stringify(interval)}`)
      while (!shutdownRequested) {
        running = true;
        logger.info(`checking logs ${JSON.stringify(interval)}`, )
        logger.info(`Current blocknum ${await provider.getBlockNumber()}`)
        logger.info(`MetaTxProxy addr: ${metaTxProxy.address}`)
        logger.info(`erc20Address addr: ${erc20.address}`)
        const transferEvents = (await provider.getLogs({
          ...erc20.filters.Transfer(),
          ...interval,
        })).filter(e => {
          logger.info(`event address: ${e.address}`)
          return e.address.toLowerCase() === process.env.META_TX_PROXY_ADDRESS.toLowerCase() || ACCEPTED_TOKEN_ADDRESSES.includes(e.address)
        });

        logger.info('')
        transferEvents.forEach(e => {
          const parsedLog = erc20.interface.parseLog(e)
          logger.info('')
          logger.info(`parsedLog: ${JSON.stringify(parsedLog)}`, )
        }

        // const processesedRequests: IPaymentRequest[] = [];
        // await Promise.allSettled(
        //   transferEvents.map(async (transferEvent) => {
        //     try {
        //       const paymentRequest = await PaymentRequest.findOne({
        //         txHash: transferEvent.transactionHash,
        //       });

        //       if (!paymentRequest) {
        //         logger.warn(
        //           `PaymentRequestEngine: No corresponding entry for deposit found in db, ignoring. TxHash: ${transferEvent.transactionHash}`,
        //         );
        //         return;
        //       }

        //       if (paymentRequest.status !== PaymentRequestStatus.created) {
        //         logger.warn(
        //           `PaymentRequestEngine: Payment request in an invalid state, ignoring. Status: ${paymentRequest.status}, id: ${paymentRequest.id}`,
        //         );
        //         return;
        //       }

        //       paymentRequest.status = PaymentRequestStatus.confirmed;
        //       await paymentRequest.save();

        //       processesedRequests.push(paymentRequest);
        //       const brcodePayment: BrcodePayment = (
        //         await starkbank.brcodePayment.create([
        //           {
        //             brcode: paymentRequest.brcode,
        //             taxId: paymentRequest.receiverTaxId,
        //             description: paymentRequest.description,
        //             amount: paymentRequest.brcodeAmount,
        //           },
        //         ])
        //       )[0];

        //       paymentRequest.status = PaymentRequestStatus.processing;
        //       paymentRequest.starkbankPaymentId = brcodePayment.id;
        //       paymentRequest.brcodeStatus = 'created';

        //       await paymentRequest.save();
        //     } catch (error) {
        //       logger.error({
        //         level: 'error',
        //         message: `PaymentRequestEngine: Error fetching payment for txHash ${transferEvent.transactionHash}`,
        //         error,
        //       });
        //     }
        //   }),
        );

        const eventLastBlock = transferEvents.reduce((acc, curr) => (curr.blockNumber > acc ? curr.blockNumber : acc) , 0)
        const currentblockNumber = await provider.getBlockNumber()
        logger.info(`---eventLastBlock: ${eventLastBlock}`)
        logger.info(`---blockNumber: ${currentblockNumber}`)
        interval.fromBlock = eventLastBlock > interval.toBlock ? eventLastBlock : interval.toBlock
        interval.fromBlock = currentblockNumber < interval.fromBlock ? currentblockNumber : interval.fromBlock
        interval.fromBlock++

        interval.toBlock = interval.fromBlock + blockInterval;
        syncBlock.lastBlock = interval.fromBlock - 1
        logger.info(`toBlock.---------- ${syncBlock.lastBlock}`)
        syncBlock = await syncBlock.save();
        await delay(10000);
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

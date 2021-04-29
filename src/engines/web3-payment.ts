import { ethers } from 'ethers';
import starkbankType from 'starkbank';
import logger from '../logger';

import { PaymentRequest, SyncBlock } from '../models'
import { PaymentRequestStatus } from '../types';

// TODO: Watch ETH transfers to cipay's wallet
// - if its valid
// - Save confirmation to db
// - Create payment request w/ starkbank
export default async function paymentRequestEngine(
  starkbank: starkbankType,
  provider: ethers.providers.JsonRpcProvider,
  erc20: ethers.Contract,
) {
  let shutdownRequested = false;
  const SYNC_BLOCK_KEY = 'SYNC_BLOCK';

  let syncBlock = await SyncBlock.findOne({ id: SYNC_BLOCK_KEY })
  if (!syncBlock) {
    // Engine starting for the very first time.
    syncBlock = new SyncBlock({
      id: SYNC_BLOCK_KEY,
      lastBlock: await provider.getBlockNumber()
    })
    await syncBlock.save()
  }


  const blockInterval = 50
  const interval = {
    fromBlock: syncBlock.lastBlock,
    toBlock: syncBlock.lastBlock + blockInterval
  };
  while(!shutdownRequested) {
    const transferEvents = await provider.getLogs({
      ...erc20.filters.Transfer(null, process.env.WALLET_ADDRESS),
      ...interval
    })

    const starkbankPaymentPayloads = []
    transferEvents.forEach(async transferEvent => {
      const paymentRequest = await PaymentRequest.findOne({ txHash: transferEvent.transactionHash});

      if (paymentRequest.status !== PaymentRequestStatus.created) {
        logger.warn(`PaymentRequestEngine: Payment request already processed, ignoring. Status: ${paymentRequest.status}, id: ${paymentRequest.id}`)
        return;
      }
      starkbankPaymentPayloads.push({
        // TODO: Add data to request starkbank to pay.
      })
    })

    // TODO: Send batch of payment requests to starkbank.
    // TODO: Update db entries to "processing".

    await syncBlock.update({ lastBlock: interval.fromBlock })
    await syncBlock.save();

    interval.fromBlock = interval.toBlock + 1
    interval.toBlock = interval.fromBlock + blockInterval;
  }

  return {
    close: function close() {
      shutdownRequested = true;
    },
    currentBlock: function currenBlock() {
      return syncBlock.lastBlock;
    }
  }
}
import { Request, Response } from 'express';
import { fetch } from 'fetch-h2';
import { BigNumber, ethers } from 'ethers';
import { Producer } from 'kafkajs';
import starkbankType from 'starkbank';
import {
  BrcodePayment,
  KafkaTopics,
  PaymentRequestStatus,
  ResponseError,
  TransferEventResult,
} from '../types';
import { erc20Interface } from '../bootstrap';
import {
  ACCEPTED_TOKEN_ADDRESSES,
  DECIMAL_PLACES,
  EXCHANGE_RATES,
  tokenAddrToIndex,
} from '../utils';
import { isPayable } from './brcode-payable';

export default (
  producer: Producer,
  provider: ethers.providers.JsonRpcProvider,
  starkbank: starkbankType,
) => async (req: Request, res: Response): Promise<void> => {
  try {
    const response = await (
      await fetch(
        `http://${process.env.KAFKA_HOSTNAME}:${process.env.KAFKA_KSQL_PORT}/query`,
        {
          method: 'POST',
          json: {
            ksql: `SELECT * FROM payment_requests_table p WHERE p.id='0x123aaa';`,
          },
        },
      )
    ).json();
    const id = '0x4564111';
    const txHash =
      '0x8c0033e8116eab2f6309a4b439d3f37bf6294d6262045f43b98c71f748c226ee';
    const brcode = 'pixbr123';
    const amount = 1000;

    const row = response[1];
    if (row) {
      await producer.send({
        topic: KafkaTopics.PaymentRequest,
        messages: [
          {
            key: id,
            value: JSON.stringify({
              id,
              txHash,
              brcode,
              amount,
              status: PaymentRequestStatus.rejected,
              reason: ResponseError.DuplicatePayment,
            }),
          },
        ],
      });
      res.status(409).send({
        status: ResponseError.DuplicatePayment,
        message: 'This payment already exists',
      });
      return;
    }

    await producer.send({
      topic: KafkaTopics.PaymentRequest,
      messages: [
        {
          key: id,
          value: JSON.stringify({
            id,
            txHash,
            brcode,
            amount,
            status: PaymentRequestStatus.created,
          }),
        },
      ],
    });

    const CONFIRMATIONS_REQUIRED = 1;
    const tx = await provider.waitForTransaction(
      txHash,
      CONFIRMATIONS_REQUIRED,
    );

    await producer.send({
      topic: KafkaTopics.PaymentRequest,
      messages: [
        {
          key: id,
          value: JSON.stringify({
            id,
            txHash,
            brcode,
            amount,
            status: PaymentRequestStatus.confirmed,
          }),
        },
      ],
    });

    const parsedLogs = tx.logs.map((log) => erc20Interface.parseLog(log));
    const transferEventSignature = 'Transfer(address,address,uint256)';
    const transferEvent = parsedLogs.find(
      (log) => log.signature === transferEventSignature,
    );
    const tokenIndex = tokenAddrToIndex[ethers.utils.getAddress(tx.to)];
    const {
      from,
      to,
      value,
    }: {
      from: string;
      to: string;
      value: BigNumber;
    } = (transferEvent.args as unknown) as TransferEventResult;

    if (!ACCEPTED_TOKEN_ADDRESSES.includes(ethers.utils.getAddress(tx.to))) {
      await producer.send({
        topic: KafkaTopics.PaymentRequest,
        messages: [
          {
            key: id,
            value: JSON.stringify({
              id,
              txHash,
              brcode,
              amount,
              tokenAddress: ethers.utils.getAddress(tx.to),
              tokenDecimals: DECIMAL_PLACES[tokenIndex],
              tokenAmount: value.toString(),
              fromAddress: from,
              status: PaymentRequestStatus.rejected,
              reason: ResponseError.InvalidToken,
            }),
          },
        ],
      });
      res.status(400).send({
        status: ResponseError.InvalidToken,
        message: 'The token used to pay the transaction is not accepted.',
      });
      return;
    }

    if (
      parsedLogs.filter((log) => log.signature === transferEventSignature)
        .length > 1
    ) {
      await producer.send({
        topic: KafkaTopics.PaymentRequest,
        messages: [
          {
            key: id,
            value: JSON.stringify({
              id,
              txHash,
              brcode,
              amount,
              tokenAddress: ethers.utils.getAddress(tx.to),
              tokenDecimals: DECIMAL_PLACES[tokenIndex],
              tokenAmount: value.toString(),
              fromAddress: from,
              status: PaymentRequestStatus.rejected,
              reason: ResponseError.MultipleTransfers,
            }),
          },
        ],
      });
      res.status(400).send({
        status: ResponseError.MultipleTransfers,
        message: 'This invalid transaction.',
      });
      return;
    }

    if (to !== process.env.WALLET) {
      await producer.send({
        topic: KafkaTopics.PaymentRequest,
        messages: [
          {
            key: id,
            value: JSON.stringify({
              id,
              txHash,
              brcode,
              amount,
              tokenAddress: ethers.utils.getAddress(tx.to),
              tokenDecimals: DECIMAL_PLACES[tokenIndex],
              tokenAmount: value.toString(),
              fromAddress: from,
              status: PaymentRequestStatus.rejected,
              reason: ResponseError.InvalidDestination,
            }),
          },
        ],
      });
      res.status(400).send({
        status: ResponseError.InvalidDestination,
        message: 'Unexpected destination address.',
      });
      return;
    }

    const paymentPreview = await isPayable(starkbank, brcode);
    if (typeof paymentPreview === 'string') return;

    const tokenDecimalPlaces =
      DECIMAL_PLACES[tokenIndex] > 2
        ? DECIMAL_PLACES[tokenIndex] - 2
        : DECIMAL_PLACES[tokenIndex];
    const tokenAmountCents = value.div(tokenDecimalPlaces);
    const tokenAmountCentsRequired = Math.floor(
      paymentPreview.amount / EXCHANGE_RATES[tokenIndex],
    );
    if (tokenAmountCents.lt(tokenAmountCentsRequired)) {
      await producer.send({
        topic: KafkaTopics.PaymentRequest,
        messages: [
          {
            key: id,
            value: JSON.stringify({
              id,
              txHash,
              brcode,
              amount,
              tokenAddress: ethers.utils.getAddress(tx.to),
              tokenDecimals: DECIMAL_PLACES[tokenIndex],
              tokenAmount: value.toString(),
              exchangeRate: EXCHANGE_RATES[tokenIndex],
              fromAddress: from,
              status: PaymentRequestStatus.failed,
              reason: ResponseError.NotEnoughFunds,
            }),
          },
        ],
      });
      res.status(400).send({
        status: ResponseError.NotEnoughFunds,
        message: 'The user did not send enough funds to cover the transaction.',
      });
    }

    const payment: BrcodePayment = (
      await starkbank.brcodePayment.create([
        {
          brcode,
          taxId: paymentPreview.taxId,
          description: JSON.stringify({
            requestID: id,
          }),
          tags: ['auto'],
        },
      ])
    )[0];

    await producer.send({
      topic: KafkaTopics.PaymentRequest,
      messages: [
        {
          key: id,
          value: JSON.stringify({
            id,
            txHash,
            brcode,
            amount,
            tokenAddress: ethers.utils.getAddress(tx.to),
            tokenDecimals: DECIMAL_PLACES[tokenIndex],
            tokenAmount: value.toString(),
            exchangeRate: EXCHANGE_RATES[tokenIndex],
            fromAddress: from,
            status: PaymentRequestStatus.processing,
            starkbankPaymentId: payment.id,
          }),
        },
      ],
    });
    res.status(200).send();
  } catch (error) {
    console.error(error);
    res.status(500).send('Error: (Please notify at vago.visus@pm.me)');
  }
};

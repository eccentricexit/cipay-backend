import { Request, Response } from 'express';
import { fetch } from 'fetch-h2';
import { BigNumber, ethers } from 'ethers';
import { Producer } from 'kafkajs';
import {
  BrcodePayment,
  KafkaTopics,
  PaymentRequestStatus,
  ResponseError,
  TransferEventResult,
} from '../types';
import { erc20Interface, provider, starkbank } from '../bootstrap';
import {
  ACCEPTED_TOKEN_ADDRESSES,
  DECIMAL_PLACES,
  EXCHANGE_RATES,
  getHttpCodeForError,
  getResponseForError,
  tokenAddrToIndex,
} from '../utils';
import { isPayable } from './brcode-payable';

export default (producer: Producer) => async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { txHash, brcode } = req.body;
    const id = ethers.utils.id(txHash + '-' + brcode);
    const response = await (
      await fetch(
        `http://${process.env.KAFKA_HOSTNAME}:${process.env.KAFKA_KSQL_PORT}/query`,
        {
          method: 'POST',
          json: {
            ksql: `SELECT * FROM payment_requests_table p WHERE p.id='${id}';`,
          },
        },
      )
    ).json();

    const row = response[1];
    if (row) {
      res
        .status(getHttpCodeForError(ResponseError.DuplicatePayment))
        .send(getHttpCodeForError(ResponseError.DuplicatePayment));
      return;
    }

    const previewOrError = await isPayable(starkbank, brcode);
    if (typeof previewOrError === 'string') {
      res
        .status(getHttpCodeForError(previewOrError))
        .send(getResponseForError(previewOrError));
      return;
    }
    const paymentPreview = previewOrError;
    const { amount } = paymentPreview;

    await producer.send({
      topic: KafkaTopics.PaymentRequest,
      messages: [
        {
          key: id,
          value: JSON.stringify({
            id,
            txHash,
            brcode,
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
      res
        .status(getHttpCodeForError(ResponseError.InvalidToken))
        .send(getResponseForError(ResponseError.InvalidToken));
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
      res
        .status(getHttpCodeForError(ResponseError.MultipleTransfers))
        .send(getResponseForError(ResponseError.MultipleTransfers));
      return;
    }

    if (to !== process.env.WALLET_ADDRESS) {
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
      res
        .status(getHttpCodeForError(ResponseError.InvalidDestination))
        .send(getResponseForError(ResponseError.InvalidDestination));
      return;
    }

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
      res
        .status(getHttpCodeForError(ResponseError.NotEnoughFunds))
        .send(getResponseForError(ResponseError.NotEnoughFunds));
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

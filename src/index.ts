import * as dotenv from 'dotenv';
import express from 'express';
import { ethers } from 'ethers';
import starkbank from 'starkbank';
import {
  BackendResponse,
  BackendResponseError,
  Balance,
  BrcodePreview,
} from './types';

// TODO: Extract payment execution into a payment engine.
// It should constantly read kafka for events and process them.
// It should also watch starkbank events that may trigger the process
// of pending payments (e.g. It should process pending payments
// when funds are added to the account).
//
// Eventually, we should move this engine to its own containerized
// application.

// TODO: Add express-slow-down and express-rate-limit.

// Configuration
console.info(`Boot started, configuring libraries.`);
dotenv.config({ path: '.env' });

starkbank.user = new starkbank.Project({
  environment: process.env.NODE_ENV,
  id: process.env.PROJECT_ID,
  privateKey: process.env.SEC256K1_PRIVATE_KEY,
});

// const provider = ethers.getDefaultProvider(process.env.NETWORK, {
//   alchemy: process.env.ALCHEMY_KEY,
//   etherscan: process.env.ETHERSCAN_KEY,
//   infura: process.env.INFURA_PROJECT_ID,
// });

(async () => {
  const app = express();
  app.get('/brcode-payable', async (req, res) => {
    try {
      const { brcode } = req.body;
      const paymentPreviews: BrcodePreview[] = await starkbank.brcodePreview.query(
        {
          brcodes: [brcode],
        },
      );

      if (
        !paymentPreviews ||
        paymentPreviews.length === 0 ||
        !paymentPreviews[0]
      ) {
        res.status(404).send({
          status: BackendResponseError.BrcodeNotFound,
          message: 'Payment not found.',
        } as BackendResponse);
        return;
      }

      // Business logic.
      const paymentPreview = paymentPreviews[0];
      if (paymentPreview.amount <= 0) {
        res.status(403).send({
          status: BackendResponseError.AmountTooSmallOrInvalid,
          message:
            'Payments without a specific amount or zero are not allowed.',
        } as BackendResponse);
        return;
      }

      if (paymentPreview.status != 'active') {
        res.status(403).send({
          status: BackendResponseError.InvalidPaymentStatus,
          message: `Payment must be active but its status is ${status}`,
        } as BackendResponse);
        return;
      }

      if (paymentPreview.allowChange != false) {
        res.status(403).send({
          status: BackendResponseError.AllowChangeForbidden,
          message: 'Changeable payments are disallowed',
        } as BackendResponse);
        return;
      }

      if (paymentPreview.amount > Number(process.env.PAYMENT_LIMIT) * 100) {
        res.status(403).send({
          status: BackendResponseError.AmountTooLarge,
          message: `Only payments of up to ${Number(
            process.env.PAYMENT_LIMIT,
          )} BRL are allowed`,
        } as BackendResponse);
        return;
      }

      const balance: Balance = await starkbank.balance.get();
      if (balance.amount < paymentPreview.amount) {
        res.status(403).send({
          status: BackendResponseError.OutOfFunds,
          message: 'Cipay cannot aford to process this payment.',
        } as BackendResponse);
        return;
      }

      res.status(200).send();
    } catch (error) {
      console.error(error);
      res.status(500).send('Error: (Please notify at vago.visus@pm.me)');
    }
  });

  app.post('/request-payment', async (req, res) => {
    try {
      // const { brcode, txHash } = req.body;
      // const paymentRequestID = ethers.utils.keccak256(txHash + '-' + brcode);

      // TODO: Check that this request was not made before.
      // TODO: Post paymentID, brcode, txHash and status waiting confirmation to kafka.

      // const CONFIRMATIONS_REQUIRED = 1;
      // const tx = await provider.waitForTransaction(
      //   txHash,
      //   CONFIRMATIONS_REQUIRED,
      // );

      // TODO: Fetch QRCode payment amount;
      // TODO: Check that txAmount covers brcode amount.
      // TODO: Check that payment amount is within threshold;
      // TODO: Check that cipay has enough funds in starkbank;

      // TODO: Post tx confirmed to kafka;
      // TODO: Request that starkbank pays the brcode.
      // TODO: Post that payment request was made to kafka.
      res.status(200).send();
    } catch (error) {
      console.error(error);
      res.status(500).send('Error: (Please notify at vago.visus@pm.me)');
    }
  });

  app.get('/payment-status', async (req, res) => {
    try {
      // TODO: Fetch QRCode payment amount;
      // TODO: Check that payment amount is within threshold;
      // TODO: Check that cipay has enough funds in starkbank;
      // Return results.

      res.status(200).send();
    } catch (error) {
      console.error(error);
      res.status(500).send('Error: (Please notify at vago.visus@pm.me)');
    }
  });

  // Starkbank payment webhook.
  const STARKBANK_HOOK_ENDPOINT = '/starkbank-hook';
  app.post(STARKBANK_HOOK_ENDPOINT, async (req, res) => {
    try {
      // TODO: Check signature to ensure tha starkbank sent the message.
      // TODO: Parse starkbank message and post results to kafka.

      res.status(200).send('success');
    } catch (error) {
      console.error(error);
      res.status(500).send('Error: (Please notify vago.visus@pm.me)');
    }
  });

  // Subscribe to Starbank webhooks
  const webhook = await starkbank.webhook.create({
    url: `https://${process.env.DOMAIN}${STARKBANK_HOOK_ENDPOINT}`,
    subscriptions: ['brcode-payment'],
  });
  console.info(`Subscribed to hook id: ${webhook.id}`);
  console.log(webhook);

  // Start the server.
  const server = app.listen(process.env.SERVER_PORT);
  console.info('Server listening on PORT', process.env.SERVER_PORT);

  // Graceful shutdown.
  process.on('SIGTERM', () => {
    console.info('SIGTERM signal received.');

    server.close(async () => {
      console.info('Http server closed.');

      await starkbank.webhook.delete(webhook.id);
      console.info('Deleted starkbank webhook');
    });
  });
})();

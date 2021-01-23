import * as dotenv from 'dotenv';
import { Kafka } from 'kafkajs';
import express from 'express';
import { ethers } from 'ethers';
import starkbank from 'starkbank';

// TODO: When the backend boots, before anything it should
// check it's state (kafka) against starkbank and the blockchain,
// resolving any pending states.

// Configuration
console.info(`Boot started, configuring libraries.`);
dotenv.config({ path: '.env' });

const kafka = new Kafka({
  clientId: 'backend',
  brokers: [`${process.env.KAFKA_HOSTNAME}:${process.env.KAFKA_BROKER_PORT}`],
});

starkbank.user = new starkbank.Project({
  environment: process.env.NODE_ENV,
  id: process.env.PROJECT_ID,
  privateKey: process.env.SEC256K1_PRIVATE_KEY,
});
const taxId = process.env.TAX_ID;

const provider = ethers.getDefaultProvider(process.env.NETWORK, {
  alchemy: process.env.ALCHEMY_KEY,
  etherscan: process.env.ETHERSCAN_KEY,
  infura: process.env.INFURA_PROJECT_ID,
});

(async () => {
  console.info('Starting producer');
  const producer = kafka.producer();

  console.info('Connecting');
  try {
    await producer.connect();
  } catch (error) {
    console.error(error);
  }

  console.info('Connected');
  await producer.send({
    topic: 'test-topic',
    messages: [{ value: 'Hello KafkaJS user!' }],
  });

  const app = express();
  app.get('/qr-payable', async (req, res) => {
    try {
      const { qrCode } = req.body;

      // TODO: Fetch QRCode payment amount;
      // TODO: Check that payment amount is within threshold;
      // TODO: Check that cipay has enough funds in starkbank;
      // TODO: Check that the qrCode was not paid yet.
      // Return results.

      res.status(200).send('success');
    } catch (error) {
      console.error(error);
      res.status(500).send('Error: (Please notify at vago.visus@pm.me)');
    }
  });

  app.post('/request-payment', async (req, res) => {
    try {
      const { qrCode, txHash } = req.body;

      // TODO: Hash qrCode, txHash to get payment requestID.
      // TODO: Check that this request was not made before.

      // TODO: Post paymentID, qrCode, txHash and status waiting confirmation to kafka.

      const CONFIRMATIONS_REQUIRED = 1;
      const tx = await provider.waitForTransaction(
        txHash,
        CONFIRMATIONS_REQUIRED,
      );

      // TODO: Fetch QRCode payment amount;
      // TODO: Check that txAmount covers qrCode amount.
      // TODO: Check that payment amount is within threshold;
      // TODO: Check that cipay has enough funds in starkbank;

      // TODO: Post tx confirmed to kafka;
      // TODO: Request that starkbank pays the qrCode.
      // TODO: Post that payment request was made to kafka.
      res.status(200).send('success');
    } catch (error) {
      console.error(error);
      res.status(500).send('Error: (Please notify at vago.visus@pm.me)');
    }
  });

  // Starkbank payment webhook.
  const STARKBANK_HOOK_ENDPOINT = '/starkbank-hook';
  app.post(STARKBANK_HOOK_ENDPOINT, async (req, res) => {
    try {
      const {
        event: { log },
      } = req.body;
      const event = log['brcode-payment'];
      // TODO: Parse starkbank message and post results to kafka.

      res.status(200).send('success');
    } catch (error) {
      console.error(error);
      res.status(500).send('Error: (Please notify vago.visus@pm.me)');
    }
  });

  app.get('/payment-status', async (req, res) => {
    try {
      const { qrCode, txHash, id } = req.body;

      // TODO: Fetch QRCode payment amount;
      // TODO: Check that payment amount is within threshold;
      // TODO: Check that cipay has enough funds in starkbank;
      // Return results.

      res.status(200).send('success');
    } catch (error) {
      console.error(error);
      res.status(500).send('Error: (Please notify at vago.visus@pm.me)');
    }
  });

  // Start the server.
  const server = app.listen(process.env.SERVER_PORT);
  console.info('Server listening on PORT', process.env.SERVER_PORT);

  // Subscribe to Starbank webhooks
  const webhook = await starkbank.webhook.create({
    url: `https://${process.env.DOMAIN}${STARKBANK_HOOK_ENDPOINT}`,
    subscriptions: ['brcode-payment'],
  });
  console.info(`Subscribed to hook id: ${webhook.id}`);
  console.log(webhook);

  process.on('SIGTERM', () => {
    console.info('SIGTERM signal received.');

    server.close(async () => {
      console.info('Http server closed.');

      await starkbank.webhook.delete(webhook.id);
      console.info('Deleted starkbank webhook');

      await producer.disconnect();
      console.info('Producer stopped');
    });
  });
})();

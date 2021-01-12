import * as dotenv from 'dotenv';
import express from 'express';
import expressWs from 'express-ws';
import { ethers } from 'ethers';
import starkbank from 'starkbank';
import { Kafka } from 'kafkajs';

// Configuration
console.info(`Boot started, configuring libraries.`);
dotenv.config({ path: '.env' });
const { app } = expressWs(express());

starkbank.user = new starkbank.Project({
  environment: process.env.NODE_ENV,
  id: process.env.PROJECT_ID,
  privateKey: process.env.SEC256K1_PRIVATE_KEY,
});

const provider = ethers.getDefaultProvider(process.env.NETWORK, {
  alchemy: process.env.ALCHEMY_KEY,
  etherscan: process.env.ETHERSCAN_KEY,
  infura: process.env.INFURA_PROJECT_ID,
});
const taxId = process.env.TAX_ID;

const kafka = new Kafka({
  clientId: 'cipay',
  brokers: [process.env.BROKER_URL],
});
const PAYMENT_TOPIC = 'pix-payment';
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'pix-payment-group' });

// Boot.
console.info(`Done. Booting...`);
(async () => {
  await producer.connect();
  await consumer.connect();
  await consumer.subscribe({ topic: PAYMENT_TOPIC });

  const STARKBANK_HOOK_ENDPOINT = '/starkbank-hook';
  app.post(STARKBANK_HOOK_ENDPOINT, async (req, res) => {
    try {
      const {
        event: { log },
      } = req.body;
      const event = log['brcode-payment'];

      await producer.send({
        topic: PAYMENT_TOPIC,
        messages: [{ key: event.brcode, value: event }],
      });
      res.status(200).send('success');
    } catch (error) {
      console.error(error);
      res.status(500).send('Error: (Please notify at vago.visus@pm.me)');
    }
  });

  const connections = new Set();
  app.ws('/pay', (ws) => {
    connections.add(ws);

    ws.addEventListener('open', () => {
      console.info(`Got connection opened`);
    });

    ws.addEventListener('message', (event) => {
      (async () => {
        try {
          const { txHash, qrCode } = JSON.parse(event.data);
          console.info(`Got payment request.`);
          console.info(`TxHash: ${txHash}`);
          console.info(`qrCode: ${qrCode}`);
          console.info('');
          // TODO: Check if this txHash was already used in
          // another payment.

          console.info('Waiting for confirmation...');
          await provider.waitForTransaction(txHash, 1); // TODO: Update this to use OVM.
          console.info('Tx Confirmed. Creating payment...');
          // TODO: Mark as used.
          // TODO: Check amount.

          // TODO: Subscribe kafkajs to event logs. Watch
          // for payment processing. Once it comes through,
          // responde with a success message to the client.
          await consumer.run({
            eachMessage: async ({ message }) => {
              // TODO stop consumer once we report back.
              if (message.key !== qrCode) return;

              consumer.stop();
              ws.send(JSON.stringify({ message: 'success' }));
            },
          });

          const { id: starkPaymentID } = (
            await starkbank.brcodePayment.create([
              {
                taxId,
                brcode: qrCode,
                description: 'Cipay payment',
                tags: ['cipay', 'pix', 'qrcode'],
              },
            ])
          )[0];
          console.info(
            `Payment created: ${starkPaymentID}. Waiting for payment execution.`,
          );
          console.info('');
        } catch (error) {
          console.error(error);
          ws.send(JSON.stringify({ message: 'error', error }));
        }
      })();
    });

    ws.addEventListener('error', () => {
      console.error('Error in websocket');
    });

    ws.addEventListener('close', (event) => {
      console.info('Closed ws connection:', event.code, event.reason);
      connections.delete(ws);
    });
  });

  // Start the server.
  app.listen(process.env.SERVER_PORT);
  console.info('Server listening on PORT', process.env.SERVER_PORT);

  // Subscribe to Starbank webhooks
  const webhook = await starkbank.webhook.create({
    url: `https://${process.env.DOMAIN}${STARKBANK_HOOK_ENDPOINT}`,
    subscriptions: ['brcode-payment'],
  });

  console.info(`Subscribed to hook id: ${webhook.id}`);
  console.log(webhook);
})();

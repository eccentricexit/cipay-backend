import * as dotenv from 'dotenv';
import express from 'express';
import starkbank from 'starkbank';
import helmet from 'helmet';
// import { ethers } from 'ethers';
import { brcodePayable, requestPayment, starkbankHook } from './handlers';

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

const STARKBANK_HOOK_ENDPOINT = '/starkbank-hook';

(async () => {
  const app = express();
  app.use(helmet());
  app.get('/brcode-payable', brcodePayable(starkbank));
  app.post('/request-payment', requestPayment());
  app.post(STARKBANK_HOOK_ENDPOINT, starkbankHook);

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

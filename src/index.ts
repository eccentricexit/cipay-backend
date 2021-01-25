import express from 'express';
import helmet from 'helmet';
import slowDown from 'express-slow-down';
import rateLimit from 'express-rate-limit';
import { disconnectAll } from 'fetch-h2';

import { brcodePayable, requestPayment, starkbankHook } from './handlers';
import { producer, starkbank } from './bootstrap';

// TODO: Extract payment execution into a payment engine.
// It should constantly read kafka for events and process them.
// It should also watch starkbank events that may trigger the process
// of pending payments (e.g. It should process pending payments
// when funds are added to the account).
//
// Eventually, we should move this engine to its own containerized
// application.

const STARKBANK_HOOK_ENDPOINT = '/starkbank-hook';
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 100,
  delayMs: 500,
});
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

(async () => {
  const app = express();
  await producer.connect();
  console.info('Producer connected.');

  app.use(helmet());
  app.use(speedLimiter);
  app.use(rateLimiter);

  app.get('/brcode-payable', brcodePayable(starkbank));

  app.post('/request-payment', requestPayment(producer));

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
  process.on('SIGINT', () => {
    server.close(async () => {
      console.info('Http server closed.');

      await starkbank.webhook.delete(webhook.id);
      console.info('Deleted starkbank webhook');

      disconnectAll();
      console.info('Closed KSQL HTTP2 connections');
    });
  });
})();

import express from 'express';
import helmet from 'helmet';
import slowDown from 'express-slow-down';
import rateLimit from 'express-rate-limit';

import { brcodePayable, requestPayment } from './handlers';
import { starkbank, provider } from './bootstrap';
import metaTxProxyAbi from './abis/metaTxProxy.json';
import { ethers } from 'ethers';

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

  app.use(helmet());
  app.use(speedLimiter);
  app.use(rateLimiter);
  app.use(express.json());

  const signer = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, provider);

  const metaTxProxy = new ethers.Contract(
    process.env.META_TX_PROXY_ADDRESS || '',
    metaTxProxyAbi,
    signer,
  );

  app.get('/brcode-payable', brcodePayable(starkbank));
  app.post('/request-payment', requestPayment(metaTxProxy, starkbank));

  // Start the server.
  const server = app.listen(process.env.SERVER_PORT);
  console.info('Server listening on PORT', process.env.SERVER_PORT);

  // Graceful shutdown.
  process.on('SIGINT', () => {
    server.close(async () => {
      console.info('Http server closed.');
    });
  });
})();

import util from 'util';
import { ethers } from 'ethers';
import { Server } from 'http';

import logger from './logger';
import SafeMongooseConnection from './lib/safe-mongoose-connection';
import app from './app';
import buildShutdown from './build-shutdown';
import { paymentRequest } from './engines';
import { provider, starkbank } from './bootstrap';
import { ACCEPTED_TOKEN_ADDRESSES } from './utils';
import erc20Abi from './abis/erc20.ovm.json';
import metaTxProxyAbi from './abis/metaTxProxy.ovm.json';
import { StarkbankWebhook } from './types';

const safeMongooseConnection = new SafeMongooseConnection({
  mongoUrl: process.env.MONGO_URL,
  debugCallback: (
    collectionName: string,
    method: string,
    query: unknown,
  ): void => {
    const message = `${collectionName}.${method}(${util.inspect(query, {
      colors: true,
      depth: null,
    })})`;
    logger.log({
      level: 'silly',
      message,
      consoleLoggerOptions: { label: 'MONGO' },
    });
  },
  onStartConnection: (mongoUrl) =>
    logger.info(`Connecting to MongoDB at ${mongoUrl}`),
  onConnectionError: (error, mongoUrl) =>
    logger.log({
      level: 'error',
      message: `Could not connect to MongoDB at ${mongoUrl}`,
      error,
    }),
  onConnectionRetry: (mongoUrl) =>
    logger.info(`Retrying to MongoDB at ${mongoUrl}`),
});

let server: Server;
function serve() {
  return app.listen(process.env.SERVER_PORT, () => {
    logger.info(`Server listening on PORT ${process.env.SERVER_PORT}`);
  });
}

let shutdown: () => void;
(async () => {
  try {
    const paymentRequestEngines = ACCEPTED_TOKEN_ADDRESSES.map((tokenAddr) =>
      paymentRequest(
        starkbank,
        provider,
        new ethers.Contract(tokenAddr, erc20Abi, provider),
        process.env.WALLET_ADDRESS,
        new ethers.Contract(process.env.META_TX_PROXY_ADDRESS, metaTxProxyAbi, provider),
      ),
    );
    paymentRequestEngines.forEach((engine) => engine.start());

    // Subscribe to Starbank webhooks
    let webhook: StarkbankWebhook;
    try {
      webhook = await starkbank.webhook.create({
        url: `${process.env.HOME_URL}/starkbank-webhook`,
        subscriptions: ['brcode-payment'],
      });
      logger.info(`Subscribed to starkbank webhook id: ${webhook.id}`);
    } catch (error) {
      if (
        error?.errors?.[0].message ===
        'This url is already registered in another webhook'
      ) {
        logger.warn(`This url is already registered in another webhook`);
      } else throw error;
    }

    safeMongooseConnection.connect((mongoUrl) => {
      logger.info(`Connected to MongoDB at ${mongoUrl}`);
      logger.info('Starting the server');
      server = serve();
      shutdown = buildShutdown(
        server,
        safeMongooseConnection,
        paymentRequestEngines,
        {
          starkbank,
          webhook,
        },
      );

      // Gracefully shut down when receiving SIGINT.
      process.on('SIGINT', shutdown);
    });
  } catch (error) {
    logger.error(error);

    // Stop receiving requests shutdown engines if something fails.
    if (shutdown) shutdown();
  }
})();

import util from 'util';
import { ethers } from 'ethers';
import { Server } from 'http';

import logger from './logger';
import SafeMongooseConnection from './lib/safe-mongoose-connection';
import app from './app';
import buildShutdown from './build-shutdown';
import { paymentRequestEngine } from './engines';
import { provider, starkbank } from './bootstrap';
import { ACCEPTED_TOKENS } from './utils';
import erc20Abi from './abis/erc20.ovm.json';
import { StarkbankWebhook } from './types';

const safeMongooseConnection = new SafeMongooseConnection({
  mongoUrl: process.env.MONGO_URL,
  debugCallback: (
    collectionName: string,
    method: string,
    query: unknown
  ): void => {
    const message = `${collectionName}.${method}(${util.inspect(query, {
      colors: true,
      depth: null
    })})`;
    logger.log({
      level: 'silly',
      message,
      consoleLoggerOptions: { label: 'MONGO' }
    });
  },
  onStartConnection: (mongoUrl) =>
    logger.info(`Connecting to MongoDB at ${mongoUrl}`),
  onConnectionError: (error, mongoUrl) =>
    logger.log({
      level: 'error',
      message: `Could not connect to MongoDB at ${mongoUrl}`,
      error
    }),
  onConnectionRetry: (mongoUrl) =>
    logger.info(`Retrying to MongoDB at ${mongoUrl}`)
});

let server: Server;
function serve() {
  return app.listen(process.env.SERVER_PORT, () => {
    logger.info(`Server listening on PORT ${process.env.SERVER_PORT}`);
  });
}

let shutdown: () => void;
async function main() {
  try {
    // Subscribe to Starbank webhooks
    let webhook: StarkbankWebhook;
    try {
      const url = `${process.env.HOME_URL}/starkbank-webhook`;
      webhook = await starkbank.webhook.create({
        url,
        subscriptions: ['brcode-payment']
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

    const paymentRequestEngines = ACCEPTED_TOKENS.map((tokenAddr) =>
      paymentRequestEngine(
        starkbank,
        provider,
        new ethers.Contract(tokenAddr, erc20Abi, provider)
      )
    );

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
          webhook
        }
      );

      // Gracefully shut down when receiving SIGINT.
      process.on('SIGINT', shutdown);
    });

    paymentRequestEngines.forEach((engine) => engine.start());
  } catch (error) {
    logger.error(error);

    // Stop receiving requests shutdown engines if something fails.
    if (shutdown) shutdown();
  }
}

main();

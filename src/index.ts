import util from 'util';
import { ethers } from 'ethers';
import { Server } from 'http';

import logger from './logger';
import SafeMongooseConnection from './lib/safe-mongoose-connection';
import app from './app';
import buildShutdown from './build-shutdown';
import { erc20Payment } from './engines';
import { arbitrumProvider, starkbank } from './bootstrap';
import { ARBITRUM_ACCEPTED_TOKENS } from './utils';
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
    const arbitrumPaymentEngines = await Promise.all(
      ARBITRUM_ACCEPTED_TOKENS.map(async (tokenAddr) =>
        erc20Payment(
          starkbank,
          arbitrumProvider,
          new ethers.Contract(tokenAddr, erc20Abi, arbitrumProvider)
        )
      )
    );
    arbitrumPaymentEngines.forEach((engine) => engine.start());

    // Subscribe to Starbank webhooks
    let webhook: StarkbankWebhook;
    try {
      webhook = await starkbank.webhook.create({
        url: `${process.env.HOME_URL}/starkbank-webhook`,
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

    safeMongooseConnection.connect((mongoUrl) => {
      logger.info(`Connected to MongoDB at ${mongoUrl}`);
      logger.info('Starting the server');
      server = serve();
      shutdown = buildShutdown(
        server,
        safeMongooseConnection,
        arbitrumPaymentEngines,
        {
          starkbank,
          webhook
        }
      );

      // Gracefully shut down when receiving SIGINT.
      process.on('SIGINT', shutdown);
    });
  } catch (error) {
    logger.error(error);

    // Stop receiving requests shutdown engines if something fails.
    if (shutdown) shutdown();
  }
}

main();

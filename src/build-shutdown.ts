import { Server } from 'http';
import delay from 'delay';
import starkbankType from 'starkbank';

import SafeMongooseConnection from './lib/safe-mongoose-connection';
import logger from './logger';
import { Engine } from './types';

/**
 * Returns a function to gracefull shutdown the system.
 * @param server The server to shutdown
 * @param safeMongooseConnection The mongoose connection to close.
 * @param engines Engines to shutdown.
 * @returns Shutdown sequence function.
 */
const buildShutdown = (
  server: Server,
  safeMongooseConnection: SafeMongooseConnection,
  engines: Engine[],
  starkbankTools?: {
    starkbank: starkbankType;
    webhook: { id: string };
  },
): (() => void) => async () => {
  logger.info('');
  logger.info('Graceful shutdown started');
  logger.info('Shutting down express server...');
  const { starkbank, webhook } = starkbankTools || {};

  // Bit of a callback hell here. TODO: Promisify this.
  server.close(async function finishShutdown(expressErr) {
    if (expressErr) {
      logger.error({
        level: 'error',
        message: 'Error shutting down express',
        error: expressErr,
      });
    } else logger.info('Server closed.');

    if (webhook) {
      // Dropping webhook.
      logger.info('Deleting starkbank webhook...');
      await starkbank.webhook.delete(webhook.id);
      logger.info('Done.');
    }

    logger.info('Shutting down engines.');
    engines.forEach((engine) => engine.stop());
    let done = false;
    while (!done) {
      if (engines.filter((engine) => engine.isRunning()).length === 0)
        done = true;
      await delay(500);
    }
    logger.info('Done.');

    logger.info('Closing the MongoDB connection...');
    safeMongooseConnection.close(async function shutdownEngines(mongoErr) {
      if (mongoErr) {
        logger.log({
          level: 'error',
          message: 'Error shutting closing mongo connection',
          error: mongoErr,
        });
      } else {
        logger.info('Mongo connection closed successfully');
      }

      process.exit(0);
    }, true);
  });
};

export default buildShutdown;

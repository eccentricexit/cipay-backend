import util from 'util';

import logger from './logger';
import SafeMongooseConnection from './lib/safe-mongoose-connection';
import app from './app';
import { Server } from 'http';

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

// TODO: Start engines.

// Start the server.
logger.info('Starting the server');
function serve() {
  return app.listen(process.env.SERVER_PORT, () => {
    logger.info(`Server listening on PORT ${process.env.SERVER_PORT}`);
  });
}

let server: Server;
if (process.env.MONGO_URL == null) {
  logger.error('MONGO_URL not specified in environment');
  process.exit(1);
} else {
  safeMongooseConnection.connect((mongoUrl) => {
    logger.info(`Connected to MongoDB at ${mongoUrl}`);
    server = serve();
  });
}

// Close the Mongoose connection, when receiving SIGINT
process.on('SIGINT', function startShutdown() {
  console.log('\n'); /* eslint-disable-line */
  logger.info('Gracefully shutting down');
  logger.info('Shutting down express server...');

  // Bit of a callback hell here. TODO: Promisify this.
  server.close(function finishShutdown(expressErr) {
    if (expressErr) {
      logger.error({
        level: 'error',
        message: 'Error shutting down express',
        error: expressErr,
      });
    } else
      logger.info('Server closed.')

    // TODO: Shut down engines.

    logger.info('Closing the MongoDB connection...')
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
  })

});

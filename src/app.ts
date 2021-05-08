import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';

import logger from './logger';
import routes from './routes';
import ApplicationError from './errors/application-error';

const app = express();
function logResponseTime(req: Request, res: Response, next: NextFunction) {
  const startHrTime = process.hrtime();
  res.on('finish', () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const elapsedTimeInMs = elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6;
    const message = `${req.method} ${res.statusCode} ${elapsedTimeInMs}ms\t${req.path}`;
    logger.log({
      level: 'info',
      message,
      consoleLoggerOptions: { label: 'API' },
    });
  });

  next();
}

app.use(logResponseTime);
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(routes);
app.use(
  (err: ApplicationError, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }

    logger.debug(err);
    return res.status(err.status || 500).json({
      message: err.message,
    });
  },
);

export default app;

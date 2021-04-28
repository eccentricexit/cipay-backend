import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import slowDown from 'express-slow-down';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

import logger from './logger';
import routes from './routes';
import ApplicationError from './errors/application-error';

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 100,
  delayMs: 500,
});
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

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
app.use(speedLimiter);
app.use(rateLimiter);
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

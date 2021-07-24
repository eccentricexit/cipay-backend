import { Request, RequestHandler, Response } from 'express';

import logger from '../logger';

export default function buildStatusController(): RequestHandler {
  return async function statusController(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      res.status(200).json({
        message: 'All systems go.'
      });
    } catch (error) {
      logger.error({
        level: 'error',
        message: `HealthCheckController: Could not fetch status.`,
        error
      });
      res.status(500).json({
        error,
        message: 'Error: (Please notify at vago.visus@pm.me)'
      });
    }
  };
}

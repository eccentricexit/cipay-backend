import { Request, RequestHandler, Response } from 'express';
import Joi from '@hapi/joi';

import requestMiddleware from '../middleware/request-middleware';
import logger from '../logger';

const paymentStatusSchema = Joi.object().keys({});

export default function buildPaymentStatusController(): RequestHandler {
  return requestMiddleware(
    async function paymentStatusController(
      req: Request,
      res: Response,
    ): Promise<void> {
      try {
        // TODO: Fetch payment request status and return.

        res.status(200).send();
      } catch (error) {
        logger.error({
          level: 'error',
          message: `PaymentStatusController: Could not fetch payment status.`,
          error,
        });
        res.status(500).json({
          error,
          message: 'Error: (Please notify at vago.visus@pm.me)',
        });
      }
    },
    { validation: { body: paymentStatusSchema } },
  );
}

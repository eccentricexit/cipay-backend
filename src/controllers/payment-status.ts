import { Request, RequestHandler, Response } from 'express';
import Joi from '@hapi/joi';

import requestMiddleware from '../middleware/request-middleware';

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
        console.error(error);
        res.status(500).send('Error: (Please notify at vago.visus@pm.me)');
      }
    },
    { validation: { body: paymentStatusSchema } },
  );
}

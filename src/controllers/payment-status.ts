import { Request, RequestHandler, Response } from 'express';

import logger from '../logger';
import { PaymentRequest } from '../models';

export default function buildPaymentStatusController(): RequestHandler {
  return async function paymentStatusController(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const { id } = req.query;
      const paymentRequest = await PaymentRequest.findOne({
        brcode: String(id),
      });
      res.status(200).json(paymentRequest);
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
  };
}

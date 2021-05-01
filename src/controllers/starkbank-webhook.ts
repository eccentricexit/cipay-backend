import { Request, RequestHandler, Response } from 'express';

import logger from '../logger';
import { PaymentRequest } from '../models';
import { PaymentRequestStatus } from '../types';

export default function buildStarkbankWebhookController(): RequestHandler {
  return async function starkbankWebhookController(
    req: Request,
    res: Response,
  ): Promise<void> {
    const { event } = req.body || {};
    const { log } = event || {};
    const { payment } = log || {};
    const { id, status } = payment || {};
    const digitalSig = req.header('Digital-Signature');

    // TODO: Verify starkbank's public key.
    logger.info(`Starkbanks digital sig: ${digitalSig}`);

    try {
      const paymentRequest = await PaymentRequest.findOne({
        starkbankPaymentId: id,
      });
      if (!paymentRequest) {
        logger.warn(
          `StarkbankWebhookController: Starkbank reported on a payment that is not saved on the db. Id: ${id}`,
        );
        return;
      }

      if (status === 'success') {
        paymentRequest.status = PaymentRequestStatus.success;
      } else {
        paymentRequest.brcodeStatus = status;
      }

      await paymentRequest.save();
      res.status(200).send();
    } catch (error) {
      logger.error({
        level: 'error',
        message: `StarkbankWebhookController: Could not process webhook. Id: ${id}`,
        error,
      });
      res.status(500).json({
        error,
        message: 'Error: (Please notify at vago.visus@pm.me)',
      });
    }
  };
}

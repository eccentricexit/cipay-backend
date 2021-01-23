import {
  BackendResponse,
  BackendResponseError,
  Balance,
  BrcodePreview,
} from '../types';
import starkbankType from 'starkbank';
import { Request, Response } from 'express';

export default (starkbank: starkbankType) => async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { brcode } = req.body;
    const paymentPreviews: BrcodePreview[] = await starkbank.brcodePreview.query(
      {
        brcodes: [brcode],
      },
    );

    if (
      !paymentPreviews ||
      paymentPreviews.length === 0 ||
      !paymentPreviews[0]
    ) {
      res.status(404).send({
        status: BackendResponseError.BrcodeNotFound,
        message: 'Payment not found.',
      } as BackendResponse);
      return;
    }

    // Business logic.
    const paymentPreview = paymentPreviews[0];
    if (paymentPreview.amount <= 0) {
      res.status(403).send({
        status: BackendResponseError.AmountTooSmallOrInvalid,
        message: 'Payments without a specific amount or zero are not allowed.',
      } as BackendResponse);
      return;
    }

    if (paymentPreview.status != 'active') {
      res.status(403).send({
        status: BackendResponseError.InvalidPaymentStatus,
        message: `Payment must be active but its status is ${status}`,
      } as BackendResponse);
      return;
    }

    if (paymentPreview.allowChange != false) {
      res.status(403).send({
        status: BackendResponseError.AllowChangeForbidden,
        message: 'Changeable payments are disallowed',
      } as BackendResponse);
      return;
    }

    if (paymentPreview.amount > Number(process.env.PAYMENT_LIMIT) * 100) {
      res.status(403).send({
        status: BackendResponseError.AmountTooLarge,
        message: `Only payments of up to ${Number(
          process.env.PAYMENT_LIMIT,
        )} BRL are allowed`,
      } as BackendResponse);
      return;
    }

    const balance: Balance = await starkbank.balance.get();
    if (balance.amount < paymentPreview.amount) {
      res.status(403).send({
        status: BackendResponseError.OutOfFunds,
        message: 'Cipay cannot aford to process this payment.',
      } as BackendResponse);
      return;
    }

    res.status(200).send();
  } catch (error) {
    console.error(error);
    res.status(500).send('Error: (Please notify at vago.visus@pm.me)');
  }
};

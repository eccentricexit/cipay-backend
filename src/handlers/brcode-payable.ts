import { Response, ResponseError, Balance, BrcodePreview } from '../types';
import starkbankType from 'starkbank';
import {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';

export const getHttpCodeForError = (error: ResponseError): number => {
  switch (error) {
    case ResponseError.BrcodeNotFound:
      return 404;
    case ResponseError.AmountTooSmallOrInvalid:
    case ResponseError.AmountTooLarge:
    case ResponseError.InvalidPaymentStatus:
    case ResponseError.AllowChangeForbidden:
      return 403;
    case ResponseError.OutOfFunds:
      return 503;
    default:
      return 500;
  }
};

export const getMessageForError = (error: ResponseError): string => {
  switch (error) {
    case ResponseError.BrcodeNotFound:
      return 'Payment not found.';
    case ResponseError.AmountTooSmallOrInvalid:
      return 'Payments without a specific amount or zero are not allowed.';
    case ResponseError.AmountTooLarge:
      return `Only payments of up to ${Number(
        process.env.PAYMENT_LIMIT,
      )} BRL are allowed`;
    case ResponseError.InvalidPaymentStatus:
      return `Payment must be active but its status is ${status}`;
    case ResponseError.AllowChangeForbidden:
      return 'Changeable payments amounts are disallowed';
    case ResponseError.OutOfFunds:
      return 'Not enough funds to to process this payment.';
    default:
      return 'An unexpected error occurred.';
  }
};

export default (starkbank: starkbankType) => async (
  req: ExpressRequest,
  res: ExpressResponse,
): Promise<void | BrcodePreview> => {
  const { brcode } = req.body;
  const previewOrError = await isPayable(starkbank, brcode);

  if (typeof previewOrError !== 'string')
    // i.e. a payment preview.
    res.send(200);
  else
    res.status(getHttpCodeForError(previewOrError)).send({
      status: previewOrError,
      message: getMessageForError(previewOrError),
    } as Response);
};

export const isPayable = async (
  starkbank: starkbankType,
  brcode: string,
): Promise<ResponseError | BrcodePreview> => {
  const paymentPreviews: BrcodePreview[] = await starkbank.brcodePreview.query({
    brcodes: [brcode],
  });

  if (!paymentPreviews || paymentPreviews.length === 0 || !paymentPreviews[0])
    return ResponseError.BrcodeNotFound;

  const paymentPreview = paymentPreviews[0];
  if (paymentPreview.amount <= 0) return ResponseError.AmountTooSmallOrInvalid;

  if (paymentPreview.status != 'active')
    return ResponseError.InvalidPaymentStatus;

  if (paymentPreview.allowChange != false)
    return ResponseError.AllowChangeForbidden;

  if (paymentPreview.amount > Number(process.env.PAYMENT_LIMIT) * 100)
    return ResponseError.AmountTooLarge;

  const balance: Balance = await starkbank.balance.get();
  if (balance.amount < paymentPreview.amount) return ResponseError.OutOfFunds;

  return paymentPreview;
};

import { ResponseError, StarkbankBalance, BrcodePreview } from '../types';
import starkbankType from 'starkbank';
import { Request, Response } from 'express';
import { getHttpCodeForError, getResponseForError } from '../utils';

export default (starkbank: starkbankType) => async (
  req: Request,
  res: Response,
): Promise<void | BrcodePreview> => {
  const { brcode } = req.body;
  const previewOrError = await isPayable(starkbank, brcode);

  if (typeof previewOrError !== 'string')
    // i.e. a payment preview.
    res.send(200);
  else
    res
      .status(getHttpCodeForError(previewOrError))
      .send(getResponseForError(previewOrError));
};

export const isPayable = async (
  starkbank: starkbankType,
  brcode: string,
): Promise<ResponseError | BrcodePreview> => {
  const paymentPreviews: BrcodePreview[] = [];
  const response = await starkbank.brcodePreview.query({
    brcodes: [brcode],
  });

  for await (const preview of response) {
    paymentPreviews.push(preview);
  }

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

  const balance: StarkbankBalance = await starkbank.balance.get();
  if (balance.amount < paymentPreview.amount) return ResponseError.OutOfFunds;

  return paymentPreview;
};

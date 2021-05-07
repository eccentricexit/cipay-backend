import starkbankType from 'starkbank';
import { Request, RequestHandler, Response } from 'express';

import { ResponseError, StarkbankBalance, BrcodePreview } from '../types';
import {
  ACCEPTED_TOKEN_ADDRESSES,
  getHttpCodeForError,
  getResponseForError,
  tokenAddrToRate,
} from '../utils';
import logger from '../logger';
import { ethers } from 'ethers';

export default function buildAmountRequiredController(
  starkbank: starkbankType,
): RequestHandler {
  return async function amountRequiredController(
    req: Request,
    res: Response,
  ): Promise<void | BrcodePreview> {
    const { brcode, tokenAddress } = req.query;
    try {
      if (
        !ACCEPTED_TOKEN_ADDRESSES.includes(
          ethers.utils.getAddress(String(tokenAddress)),
        )
      ) {
        res
          .status(getHttpCodeForError(ResponseError.InvalidToken))
          .json(getResponseForError(ResponseError.InvalidToken));
        return;
      }

      const previewOrError = await isPayable(starkbank, String(brcode));
      if (typeof previewOrError === 'string') {
        res
          .status(getHttpCodeForError(previewOrError))
          .json(getResponseForError(previewOrError));
        return;
      }

      const tokenRate =
        tokenAddrToRate[ethers.utils.getAddress(String(tokenAddress))];
      const normalizedRate = ethers.BigNumber.from(tokenRate);

      const transferAmountRequired = normalizedRate.mul(
        ethers.BigNumber.from(previewOrError.amount).add(
          ethers.BigNumber.from(process.env.BASE_FEE_BRL),
        ),
      );

      res.status(200).json({
        ...previewOrError,
        tokenAmountRequired: transferAmountRequired.toString(),
      });
    } catch (error) {
      logger.error({
        level: 'error',
        message: `amountRequiredController: Error checking if brcode is payable: ${brcode}`,
        error,
      });
      res.status(500).json({
        error,
        message: 'Error: (Please notify at vago.visus@pm.me)',
      });
    }
  };
}

export async function isPayable(
  starkbank: starkbankType,
  brcode: string,
): Promise<ResponseError | BrcodePreview> {
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

  if (paymentPreview.status !== 'active')
    return ResponseError.InvalidPaymentStatus;

  if (paymentPreview.allowChange != false)
    return ResponseError.AllowChangeForbidden;

  if (paymentPreview.amount > Number(process.env.PAYMENT_LIMIT) * 100)
    return ResponseError.AmountTooLarge;

  const balance: StarkbankBalance = await starkbank.balance.get();
  if (balance.amount < paymentPreview.amount) return ResponseError.OutOfFunds;

  return paymentPreview;
}

import starkbankType from 'starkbank';
import { Request, RequestHandler, Response } from 'express';

import { ResponseError, StarkbankBalance, BrcodePreview } from '../types';
import {
  ACCEPTED_TOKENS,
  getHttpCodeForError,
  getResponseForError,
  tokenAddrToDecimals,
  tokenAddrToRate,
  tokenAddrToSymbol
} from '../utils';
import logger from '../logger';
import { BigNumber, ethers } from 'ethers';

export default function buildAmountRequiredController(
  starkbank: starkbankType
): RequestHandler {
  return async function amountRequiredController(
    req: Request,
    res: Response
  ): Promise<void | BrcodePreview> {
    const { brcode, tokenAddress } = req.query;
    try {
      if (
        !ACCEPTED_TOKENS.includes(ethers.utils.getAddress(String(tokenAddress)))
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

      const amountBRLInCents = previewOrError.amount;

      // Convert to bignumber and add 18 decimal places.
      const amountBRL = BigNumber.from(amountBRLInCents).mul(
        BigNumber.from(10).pow(BigNumber.from(16))
      );
      const tokenRate =
        tokenAddrToRate[ethers.utils.getAddress(String(tokenAddress))];
      const normalizedRate = BigNumber.from(tokenRate.toString());

      // Minimum fee per payment: 1 BRL.
      const baseFee = BigNumber.from(process.env.BASE_FEE_BRL_CENTS).mul(
        BigNumber.from(10).pow(BigNumber.from(16))
      );

      // Amount of DAI required.
      const BASIS_POINTS = BigNumber.from(10000);
      const cipayFee = amountBRL
        .mul(
          BigNumber.from(process.env.CIPAY_FEE_PCT)
            .mul(BASIS_POINTS)
            .div(BigNumber.from(100))
        )
        .div(BASIS_POINTS);
      const amountBRLDue = amountBRL.add(baseFee).add(cipayFee);

      // Add 18 decimal places to avoid precision losses.
      const PRECISION = BigNumber.from(10).pow(BigNumber.from(18));
      const transferAmountRequired = amountBRLDue
        .mul(PRECISION)
        .div(normalizedRate);

      res.status(200).json({
        ...previewOrError,
        tokenAmountRequired: transferAmountRequired.toString(),
        tokenDecimals:
          tokenAddrToDecimals[ethers.utils.getAddress(String(tokenAddress))],
        tokenSymbol:
          tokenAddrToSymbol[ethers.utils.getAddress(String(tokenAddress))]
      });
    } catch (error) {
      logger.error({
        level: 'error',
        message: `amountRequiredController: Error checking if brcode is payable: ${brcode}`,
        error
      });
      res.status(500).json({
        error,
        message: 'Error: (Please notify at vago.visus@pm.me)'
      });
    }
  };
}

export async function isPayable(
  starkbank: starkbankType,
  brcode: string
): Promise<ResponseError | BrcodePreview> {
  const paymentPreviews: BrcodePreview[] = [];
  const response = await starkbank.brcodePreview.query({
    brcodes: [brcode]
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

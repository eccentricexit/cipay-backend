import { BigNumber, ethers } from 'ethers';
import { Request, RequestHandler, Response } from 'express';
import starkbankType from 'starkbank';
import Joi from '@hapi/joi';

import requestMiddleware from '../middleware/request-middleware';
import { BrcodePreview, PaymentRequestStatus, ResponseError } from '../types';
import {
  ACCEPTED_TOKENS,
  getHttpCodeForError,
  getResponseForError,
  tokenAddrToRate
} from '../utils';
import { isPayable } from './amount-required';
import { PaymentRequest } from '../models';
import logger from '../logger';

interface SignRequest {
  from: string;
  to: string;
  tokenContract: string;
  amount: string;
  nonce: number;
  expiry: number;
}

const requestERC20PaymentSchema = Joi.object().keys({
  brcode: Joi.string().required(),
  web3: Joi.object()
    .keys({
      signature: Joi.string().required(),
      typedData: Joi.object()
        .keys({
          domain: Joi.object()
            .keys({
              name: Joi.string().required(),
              verifyingContract: Joi.string().required(),
              version: Joi.string().required(),
              chainId: Joi.string().required()
            })
            .required(),
          types: Joi.object()
            .keys({
              ERC20MetaTransaction: Joi.array()
                .items(
                  Joi.object({
                    name: Joi.string().required(),
                    type: Joi.string().required()
                  }).required()
                )
                .required()
            })
            .required(),
          message: Joi.object()
            .keys({
              from: Joi.string().required(),
              to: Joi.string().required(),
              tokenContract: Joi.string().required(),
              amount: Joi.string().required(),
              nonce: Joi.number().required(),
              expiry: Joi.number().required()
            })
            .required()
        })
        .required(),
      claimedAddr: Joi.string().required()
    })
    .required()
});

/**
 * Builds a handler to allow BRL payments with erc20 tokens.
 * @param metaTxProxy The contract to relay meta txes to.
 * @param starkbank Starkbank instance with funds to pay a brcode.
 * @returns The request handler.
 */
export default function buildRequestERC20PaymentController(
  metaTxProxy: ethers.Contract,
  starkbank: starkbankType
): RequestHandler {
  return requestMiddleware(
    async function requestERC20PaymentController(
      req: Request,
      res: Response
    ): Promise<void | BrcodePreview> {
      try {
        const {
          web3: { signature, typedData, claimedAddr },
          brcode
        } = req.body;

        const { domain, types } = typedData;
        const message = typedData.message as SignRequest;
        const { tokenContract: tokenAddress, amount, to, nonce } = message;
        if (!ACCEPTED_TOKENS.includes(ethers.utils.getAddress(tokenAddress))) {
          res
            .status(getHttpCodeForError(ResponseError.InvalidToken))
            .json(getResponseForError(ResponseError.InvalidToken));
          return;
        }

        const recoveredAddr = ethers.utils.verifyTypedData(
          domain,
          types,
          message,
          signature
        );

        if (ethers.utils.getAddress(claimedAddr) !== recoveredAddr) {
          res
            .status(getHttpCodeForError(ResponseError.FailedSigValidation))
            .json(getResponseForError(ResponseError.FailedSigValidation));
          return;
        }

        if (
          ethers.utils.getAddress(to) !==
          ethers.utils.getAddress(process.env.WALLET_ADDRESS)
        ) {
          res
            .status(getHttpCodeForError(ResponseError.InvalidDestination))
            .json({
              ...getResponseForError(ResponseError.InvalidDestination),
              expected: process.env.WALLET_ADDRESS,
              received: to
            });
          return;
        }

        const [nonceExpected, previewOrError] = await Promise.all([
          metaTxProxy.nonce(recoveredAddr),
          isPayable(starkbank, brcode)
        ]);

        if (Number(nonceExpected) + 1 !== nonce) {
          res.status(getHttpCodeForError(ResponseError.InvalidNonce)).json({
            ...getResponseForError(ResponseError.InvalidNonce),
            expected: (nonceExpected + 1).toString(),
            received: nonce
          });
          return;
        }

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

        if (ethers.BigNumber.from(amount).lt(transferAmountRequired)) {
          res
            .status(getHttpCodeForError(ResponseError.NotEnoughFunds))
            .json(getResponseForError(ResponseError.NotEnoughFunds));
          return;
        }

        const paymentRequest = new PaymentRequest({
          brcode,
          payerAddr: recoveredAddr,
          coin: tokenAddress,
          rate: tokenAddrToRate[tokenAddress],
          status: PaymentRequestStatus.created,
          receiverTaxId: previewOrError.taxId,
          description: previewOrError.description,
          brcodeAmount: previewOrError.amount
        });
        await paymentRequest.save();

        const callData = {
          from: message.from,
          to: message.to,
          signature
        };
        const callParams = {
          tokenContract: message.tokenContract,
          amount: message.amount,
          nonce: message.nonce,
          expiry: message.expiry.toString()
        };

        const tx = await metaTxProxy.executeMetaTransaction(
          callData,
          callParams
        );

        paymentRequest.txHash = tx.hash;
        paymentRequest.status = PaymentRequestStatus.submitted;
        await paymentRequest.save();

        tx.wait();

        res.status(200).json(paymentRequest);
      } catch (error) {
        logger.error({
          level: 'error',
          message: `Failed to accept payment for request.`,
          error
        });
        res.status(500).json({
          error,
          message: 'Error: (Please notify at vago.visus@pm.me)'
        });
      }
    },
    { validation: { body: requestERC20PaymentSchema } }
  );
}

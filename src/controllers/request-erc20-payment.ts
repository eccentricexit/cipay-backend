import { ethers } from 'ethers';
import { Request, RequestHandler, Response } from 'express';
import starkbankType from 'starkbank';
import Joi from '@hapi/joi';

import requestMiddleware from '../middleware/request-middleware';
import { BrcodePreview, PaymentRequestStatus, ResponseError } from '../types';
import {
  OPTIMISM_ACCEPTED_TOKENS,
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

interface Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

const requestPaymentSchema = Joi.object().keys({
  brcode: Joi.string().required(),
  web3: Joi.object()
    .keys({
      signature: Joi.string().required(),
      typedData: Joi.object()
        .keys({
          domain: Joi.object()
            .keys({
              name: Joi.string().required(),
              version: Joi.string().required(),
              chainId: Joi.number().required(),
              verifyingContract: Joi.string().required()
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
 * @param metaTxRelay The contract to relay meta txes to.
 * @param starkbank Starkbank instance with funds to pay a brcode.
 * @returns The request handler.
 */
export default function buildRequestErc20PaymentController(
  metaTxRelay: ethers.Contract,
  starkbank: starkbankType
): RequestHandler {
  return requestMiddleware(
    async function requestErc20PaymentController(
      req: Request,
      res: Response
    ): Promise<void | BrcodePreview> {
      try {
        const {
          web3: { signature, typedData, claimedAddr },
          brcode
        } = req.body;

        const { types } = typedData;
        const domain = typedData.domain as Domain;
        const message = typedData.message as SignRequest;
        const { tokenContract: tokenAddress, amount, to, nonce } = message;

        // Check if the token is accepted.
        if (
          !OPTIMISM_ACCEPTED_TOKENS.includes(
            ethers.utils.getAddress(tokenAddress)
          )
        ) {
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

        // Validate signature.
        if (ethers.utils.getAddress(claimedAddr) !== recoveredAddr) {
          res
            .status(getHttpCodeForError(ResponseError.FailedSigValidation))
            .json(getResponseForError(ResponseError.FailedSigValidation));
          return;
        }

        // Check that the signed message sends to the right address.
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
          metaTxRelay.nonce(recoveredAddr),
          isPayable(starkbank, brcode)
        ]);

        // Defend against replays.
        if (Number(nonceExpected) + 1 !== nonce) {
          res.status(getHttpCodeForError(ResponseError.InvalidNonce)).json({
            ...getResponseForError(ResponseError.InvalidNonce),
            expected: (nonceExpected + 1).toString(),
            received: nonce
          });
          return;
        }

        // Validate invoice.
        if (typeof previewOrError === 'string') {
          res
            .status(getHttpCodeForError(previewOrError))
            .json(getResponseForError(previewOrError));
          return;
        }

        const normalizedRate = ethers.BigNumber.from(
          tokenAddrToRate[ethers.utils.getAddress(tokenAddress)]
        );
        const transferAmountRequired = normalizedRate.mul(
          ethers.BigNumber.from(previewOrError.amount).add(
            ethers.BigNumber.from(process.env.BASE_FEE_BRL)
          )
        );

        // Check that the amount of tokens paid covers the invoice.
        if (ethers.BigNumber.from(amount).lt(transferAmountRequired)) {
          res
            .status(getHttpCodeForError(ResponseError.NotEnoughFunds))
            .json(getResponseForError(ResponseError.NotEnoughFunds));
          return;
        }

        // Create payment request.
        const paymentRequest = new PaymentRequest({
          brcode,
          payerAddr: recoveredAddr,
          coin: tokenAddress,
          rate: tokenAddrToRate[tokenAddress],
          status: PaymentRequestStatus.created,
          receiverTaxId: previewOrError.taxId,
          description: previewOrError.description,
          brcodeAmount: previewOrError.amount,
          chainId: domain.chainId
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

        // Propagate transaction.
        const tx = await metaTxRelay.executeMetaTransaction(
          callData,
          callParams
        );

        // Save tx hash.
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
    { validation: { body: requestPaymentSchema } }
  );
}

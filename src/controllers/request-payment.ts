import { ethers } from 'ethers';
import { Request, RequestHandler, Response } from 'express';
import starkbankType from 'starkbank';
import Joi from '@hapi/joi';

import requestMiddleware from '../middleware/request-middleware';
import { BrcodePreview, PaymentRequestStatus, ResponseError } from '../types';
import { ACCEPTED_TOKEN_ADDRESSES, getHttpCodeForError, getResponseForError, tokenAddrToRate } from '../utils';
import { isPayable } from './brcode-payable';
import { PaymentRequest } from '../models';

const requestPaymentSchema = Joi.object().keys({
  brcode: Joi.string().required(),
  web3: Joi.object()
    .keys({
      signature: Joi.string().required(),
      typedData: Joi.object()
        .keys({
          domain: Joi.object()
            .keys({
              chainId: Joi.number().required(),
              name: Joi.string().required(),
              verifyingContract: Joi.string().required(),
              version: Joi.string().required(),
            })
            .required(),
          types: Joi.object()
            .keys({
              ForwardRequest: Joi.array()
                .items(Joi.object().required())
                .required(),
            })
            .required(),
          message: Joi.object()
            .keys({
              data: Joi.string().required(),
              from: Joi.string().required(),
              gas: Joi.number().required(),
              nonce: Joi.string().required(),
              to: Joi.string().required(),
              value: Joi.number().required(),
            })
            .required(),
        })
        .required(),
      claimedAddr: Joi.string().required(),
    })
    .required(),
});

/**
 * Builds a handler to allow BRL payments with crypto.
 * @param metaTxProxy The contract to relay meta txes to.
 * @param starkbank Starkbank instance with funds to pay a brcode.
 * @returns The request handler
 */
export default function buildRequestPaymentController(
  metaTxProxy: ethers.Contract,
  starkbank: starkbankType,
): RequestHandler {
  return requestMiddleware(
    async function requestPaymentController(
      req: Request,
      res: Response,
    ): Promise<void | BrcodePreview> {
      try {
        const {
          web3: {
            signature,
            typedData: { domain, types, message },
            claimedAddr,
          },
          brcode,
        } = req.body;

        const recoveredAddr = ethers.utils.verifyTypedData(
          domain,
          types,
          message,
          signature,
        );

        if (ethers.utils.getAddress(claimedAddr) !== recoveredAddr.toLowerCase()) {
          res
            .status(getHttpCodeForError(ResponseError.FailedSigValidation))
            .json(getResponseForError(ResponseError.FailedSigValidation));
          return;
        }

        const { to: tokenAddress } = message
        if (!ACCEPTED_TOKEN_ADDRESSES.includes(ethers.utils.getAddress(tokenAddress))){
          res
            .status(getHttpCodeForError(ResponseError.InvalidToken))
            .json(getResponseForError(ResponseError.InvalidToken));
          return;
        }

        const [nonce, previewOrError] = await Promise.all([
          metaTxProxy.nonces(recoveredAddr),
          isPayable(starkbank, brcode)
        ]);

        if (nonce.toString() !== message.nonce) {
          res
            .status(getHttpCodeForError(ResponseError.InvalidNonce))
            .json(getResponseForError(ResponseError.InvalidNonce));
          return;
        }

        if (typeof previewOrError === 'string') {
          res
            .status(getHttpCodeForError(previewOrError))
            .json(getResponseForError(previewOrError));
          return;
        }

        const tx = await metaTxProxy.execute(message, signature);
        const paymentRequest = new PaymentRequest({
          brcode,
          payerAddr: recoveredAddr,
          coin: tokenAddress,
          rate: tokenAddrToRate[tokenAddress],
          status: PaymentRequestStatus.created,
          txHash: tx.hash,
          receiverTaxId: previewOrError.taxId,
          description: previewOrError.description,
          brcodeAmount: previewOrError.amount,
        });
        await paymentRequest.save()
        res.status(200).json(paymentRequest);
      } catch (error) {
        console.error(error);
        res.status(500).send('Error: (Please notify at vago.visus@pm.me)');
      }
    },
    { validation: { body: requestPaymentSchema } },
  );
}

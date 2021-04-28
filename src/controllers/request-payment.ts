import { ethers } from 'ethers';
import { Request, RequestHandler, Response } from 'express';
import starkbankType from 'starkbank';
import Joi from '@hapi/joi';

import requestMiddleware from '../middleware/request-middleware';
import { BrcodePreview, ResponseError } from '../types';
import { getHttpCodeForError, getResponseForError } from '../utils';
import { isPayable } from './brcode-payable';

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

        if (claimedAddr.toLowerCase() !== recoveredAddr.toLowerCase()) {
          res
            .status(getHttpCodeForError(ResponseError.FailedSigValidation))
            .json(getResponseForError(ResponseError.FailedSigValidation));
          return;
        }

        // TODO: Verify address is whitelisted.

        const [nonce, previewOrError] = await Promise.all([
          metaTxProxy.nonces(recoveredAddr),
          isPayable(starkbank, brcode),
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

        // TODO: Verify it was not already received.

        // TODO: Save payment request.
        // TODO: Submit transaction to relay proxy.

        // const tx = await metaTxProxy.execute(message, signature);
        // await tx.wait();
        // res.status(200).send({
        //   hash: tx.hash,
        // });
        res.status(200).send();
      } catch (error) {
        console.error(error);
        res.status(500).send('Error: (Please notify at vago.visus@pm.me)');
      }
    },
    { validation: { body: requestPaymentSchema } },
  );
}

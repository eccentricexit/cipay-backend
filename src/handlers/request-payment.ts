import { ethers } from 'ethers';
import { Request, Response } from 'express';
import starkbankType from 'starkbank';

import { ResponseError } from '../types';
import { getHttpCodeForError, getResponseForError } from '../utils';
import { isPayable } from './brcode-payable';

export default (
  metaTxProxy: ethers.Contract,
  starkbank: starkbankType,
) => async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      web3: {
        signature,
        typedData: { domain, types, message },
      },
      brcode,
    } = req.body;

    const address = ethers.utils.verifyTypedData(
      domain,
      types,
      message,
      signature,
    );

    // TODO: Verify address is whitelisted.

    const [nonce, previewOrError] = await Promise.all([
      metaTxProxy.nonces(address),
      isPayable(starkbank, brcode),
    ]);

    if (nonce.toString() !== message.nonce) {
      res
        .status(getHttpCodeForError(ResponseError.InvalidNonce))
        .send(getResponseForError(ResponseError.InvalidNonce));
      return;
    }

    if (typeof previewOrError === 'string') {
      res
        .status(getHttpCodeForError(previewOrError))
        .send(getResponseForError(previewOrError));
      return;
    }

    // TODO: Verify it was not already received.
    // TODO: Verify the amount is payable.

    // TODO: Save payment request.
    // TODO: Submit transaction to relay proxy.

    res.status(200).send();
  } catch (error) {
    console.error(error);
    res.status(500).send('Error: (Please notify at vago.visus@pm.me)');
  }
};

import { Request, Response } from 'express';

export default () => async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { request, brcode } = req.body;

    // TODO: Verify signature.
    // TODO: Verify nonce.
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

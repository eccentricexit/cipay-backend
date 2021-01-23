import { Request, Response } from 'express';

export default () => async (req: Request, res: Response): Promise<void> => {
  try {
    // const { brcode, txHash } = req.body;
    // const paymentRequestID = ethers.utils.keccak256(txHash + '-' + brcode);

    // TODO: Check that this request was not made before.
    // TODO: Post paymentID, brcode, txHash and status waiting confirmation to kafka.

    // const CONFIRMATIONS_REQUIRED = 1;
    // const tx = await provider.waitForTransaction(
    //   txHash,
    //   CONFIRMATIONS_REQUIRED,
    // );

    // TODO: Fetch QRCode payment amount;
    // TODO: Check that txAmount covers brcode amount.
    // TODO: Check that payment amount is within threshold;
    // TODO: Check that cipay has enough funds in starkbank;

    // TODO: Post tx confirmed to kafka;
    // TODO: Request that starkbank pays the brcode.
    // TODO: Post that payment request was made to kafka.
    res.status(200).send();
  } catch (error) {
    console.error(error);
    res.status(500).send('Error: (Please notify at vago.visus@pm.me)');
  }
};

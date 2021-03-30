import { Request, Response } from 'express';

export default () => async (req: Request, res: Response): Promise<void> => {
  try {
    // TODO: Fetch payment request status and return.

    res.status(200).send();
  } catch (error) {
    console.error(error);
    res.status(500).send('Error: (Please notify at vago.visus@pm.me)');
  }
};

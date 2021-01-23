import { Request, Response } from 'express';

export default () => async (req: Request, res: Response): Promise<void> => {
  try {
    // TODO: Check signature to ensure tha starkbank sent the message.
    // TODO: Parse starkbank message and post results to kafka.

    res.status(200).send('success');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error: (Please notify vago.visus@pm.me)');
  }
};

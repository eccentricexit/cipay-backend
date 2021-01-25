import { Request, Response } from 'express';

export default () => async (req: Request, res: Response): Promise<void> => {
  try {
    console.info('Got webhook');
    console.info(req);
    console.info('');
    try {
      console.info(await req.body());
    } catch (err) {
      console.error(err);
    }

    res.status(200).send('success');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error: (Please notify vago.visus@pm.me)');
  }
};

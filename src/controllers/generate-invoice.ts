import { Request, RequestHandler, Response } from 'express';
import starkbankType from 'starkbank';

import { BrcodePreview } from '../types';
import logger from '../logger';

/**
 * Builds a handler to allow generating brcodes for testing.
 * @param starkbank Starkbank instance to generate the brcode.
 * @returns The request handler.
 */
export default function buildGenerateInvoice(
  starkbank: starkbankType
): RequestHandler {
  return async function GenbuildGenerateInvoice(
    req: Request,
    res: Response
  ): Promise<void | BrcodePreview> {
    try {
      const invoices = await starkbank.invoice.create([
        {
          amount: 1,
          taxId: '012.345.678-90',
          name: 'Jon Snow'
        }
      ]);

      res.status(200).json({
        invoice: invoices[0]
      });
    } catch (error) {
      logger.error({
        level: 'error',
        message: `Failed to generate invoice. ${JSON.stringify(req.body)}`,
        error
      });
      res.status(500).json({
        error,
        message: 'Error: (Please notify at vago.visus@pm.me)'
      });
    }
  };
}

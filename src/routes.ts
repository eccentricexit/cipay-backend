import { Router } from 'express';
import { ethers } from 'ethers';

import { starkbank, provider } from './bootstrap';
import metaTxProxyAbi from './abis/metaTxProxy.json';
import {
  buildBrcodePayableController,
  buildRequestPaymentController,
  buildPaymentStatusController,
} from './controllers';

const signer = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, provider);
const metaTxProxy = new ethers.Contract(
  process.env.META_TX_PROXY_ADDRESS || '',
  metaTxProxyAbi,
  signer,
);

const router = Router();

router.get('/v1/brcode-payable', buildBrcodePayableController(starkbank));
router.post(
  '/v1/request-payment',
  buildRequestPaymentController(metaTxProxy, starkbank),
);
router.get('/v1/payment-status', buildPaymentStatusController());

export default router;

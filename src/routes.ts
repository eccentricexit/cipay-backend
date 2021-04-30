import { Router } from 'express';
import { ethers } from 'ethers';

import { starkbank, provider } from './bootstrap';
import metaTxProxyAbi from './abis/metaTxProxy.ovm.json';
import {
  buildBrcodePayableController,
  buildRequestPaymentController,
  buildPaymentStatusController,
  buildStarkbankWebhookController,
} from './controllers';

const signer = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, provider);
const metaTxProxy = new ethers.Contract(
  process.env.META_TX_PROXY_ADDRESS || '',
  metaTxProxyAbi,
  signer,
);

const router = Router();

router.get('/v1/brcode-payable', buildBrcodePayableController(starkbank));
router.get('/v1/payment-status', buildPaymentStatusController());
router.post(
  '/v1/request-payment',
  buildRequestPaymentController(metaTxProxy, starkbank, provider),
);

router.post('/starkbank-webhook', buildStarkbankWebhookController());

export default router;

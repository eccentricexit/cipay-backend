import { Router } from 'express';
import { ethers } from 'ethers';

import { starkbank, provider } from './bootstrap';
import metaTxProxyAbi from './abis/metaTxProxy.ovm.json';
import {
  buildAmountRequiredController,
  buildRequestErc20PaymentController,
  buildPaymentStatusController,
  buildStarkbankWebhookController,
  buildStatusController,
  buildGenerateInvoice
} from './controllers';

const signer = new ethers.Wallet(process.env.RELAYER_KEY, provider);
const metaTxProxy = new ethers.Contract(
  process.env.META_TX_PROXY_ADDRESS || '',
  metaTxProxyAbi,
  signer
);

const router = Router();

router.get('/v1/status', buildStatusController());
router.get('/v1/amount-required', buildAmountRequiredController(starkbank));
router.get('/v1/payment-status', buildPaymentStatusController());
router.post(
  '/v1/request-erc20-payment',
  buildRequestErc20PaymentController(metaTxProxy, starkbank)
);

if (process.env.NODE_ENV === 'sandbox')
  router.post('/v1/generate-brcode', buildGenerateInvoice(starkbank));

router.post('/starkbank-webhook', buildStarkbankWebhookController());

export default router;

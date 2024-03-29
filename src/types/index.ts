import { BigNumber } from 'ethers';

export interface BrcodePreview {
  id: string;
  status: string;
  name: string;
  taxId: string;
  bankCode: string;
  branchCode: string;
  accountNumber: string;
  accountType: string;
  allowChange: boolean;
  amount: number;
  reconciliationId: string;
  description: string;
}

export interface BrcodePayment {
  id: string;
  brcode: string;
  taxId: string;
  description: string;
  amount: number;
  scheduled: string;
  tags: string[];
  status: string;
  type: string;
  fee: number;
  updated: string;
  created: string;
  transactionIds: [];
}

export interface StarkbankBalance {
  id: string;
  amount: number;
  currency: string;
  updated: string;
}

export interface StarkbankWebhook {
  id: string;
  url: string;
  subscriptions: [string];
}

export interface BackendResponse {
  error?: ResponseError;
  message?: string;
}

export interface TransferEventResult {
  from: string;
  to: string;
  value: BigNumber;
}

export enum ResponseError {
  BrcodeNotFound = 'brcode-not-found',
  AmountTooSmallOrInvalid = 'amount-too-small-or-invalid',
  AmountTooLarge = 'amount-too-large',
  OutOfFunds = 'out-of-funds',
  InvalidPaymentStatus = 'invalid-payment-status',
  AllowChangeForbidden = 'payment-is-changeable',
  DuplicatePayment = 'duplicate-payment',
  MultipleTransfers = 'multiple-transfers',
  InvalidDestination = 'invalid-destination',
  InvalidToken = 'invalid-token',
  NotEnoughFunds = 'not-enough-funds',
  InvalidNonce = 'invalid-nonce',
  FailedSigValidation = 'failed-sig-validation'
}

export enum PaymentRequestStatus {
  created, // Request received and awaits token tx submission.
  submitted, // Token transfer tx submitted, awaiting confirmation.
  confirmed, // Request confirmed and is being processed.
  rejected, // These should be used for failed payments that do not warrant refund.
  failed, // This is pending a refund.
  refunded, // This payment request failed and the client was refunded.
  processing, // Waiting fiat payment.
  success // Request processed.
}

export interface Engine {
  start: () => Promise<void>;
  stop: () => void;
  isRunning: () => boolean;
}

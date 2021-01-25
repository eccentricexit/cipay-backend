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
}

export interface Balance {
  id: string;
  amount: number;
  currency: string;
  updated: string;
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

export interface Response {
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
}

export enum PaymentRequestStatus {
  created, // Request received and awaits token tx confirmation.
  confirmed, // Request confirmed and is being processed.
  rejected, // These should be used for failed payments that do not warrant refund.
  failed, // This is pending a refund.
  refunded, // This payment request failed and the client was refunded.
  processing, // Waiting bank payment.
  success, // Request processed.
}

export enum KafkaTopics {
  PaymentRequest = 'payment_request',
}

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

export enum BackendResponseError {
  BrcodeNotFound = 'brcode-not-found',
  AmountTooSmallOrInvalid = 'amount-too-small-or-invalid',
  AmountTooLarge = 'amount-too-large',
  OutOfFunds = 'out-of-funds',
  InvalidPaymentStatus = 'invalid-payment-status',
  AllowChangeForbidden = 'payment-is-changeable',
}

export interface BackendResponse {
  error?: BackendResponse;
  message?: string;
}

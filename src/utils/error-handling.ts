import { ResponseError, BackendResponse } from '../types';

export const getHttpCodeForError = (error: ResponseError): number => {
  switch (error) {
    case ResponseError.InvalidToken:
    case ResponseError.MultipleTransfers:
    case ResponseError.InvalidDestination:
    case ResponseError.NotEnoughFunds:
    case ResponseError.InvalidNonce:
      return 400;
    case ResponseError.BrcodeNotFound:
      return 404;
    case ResponseError.AmountTooSmallOrInvalid:
    case ResponseError.AmountTooLarge:
    case ResponseError.InvalidPaymentStatus:
    case ResponseError.AllowChangeForbidden:
      return 403;
    case ResponseError.DuplicatePayment:
      return 409;
    case ResponseError.OutOfFunds:
      return 503;
    default:
      throw new Error(`Unhandled response error: ${error}`);
  }
};

const getMessageForError = (error: ResponseError): string => {
  switch (error) {
    case ResponseError.BrcodeNotFound:
      return 'Payment not found.';
    case ResponseError.AmountTooSmallOrInvalid:
      return 'Payments without a specific amount or zero are not allowed.';
    case ResponseError.AmountTooLarge:
      return `Only payments of up to ${Number(
        process.env.PAYMENT_LIMIT,
      )} BRL are allowed`;
    case ResponseError.InvalidPaymentStatus:
      return `Invalid payment status`;
    case ResponseError.AllowChangeForbidden:
      return 'Changeable payments amounts are disallowed';
    case ResponseError.OutOfFunds:
      return 'Not enough funds to to process this payment.';
    case ResponseError.InvalidToken:
      return 'The token used to pay the transaction is not accepted.';
    case ResponseError.DuplicatePayment:
      return 'This payment already exists.';
    case ResponseError.MultipleTransfers:
      return 'The token transaction used for this payment does not look right.';
    case ResponseError.NotEnoughFunds:
      return 'The user did not send enough funds to cover the transaction.';
    case ResponseError.InvalidDestination:
      return 'The tokens used for this payment were sent to an unexpected address.';
    case ResponseError.InvalidNonce:
      return 'The nonce provided does not match the required nonce in the meta tx relay contract.';
    default:
      throw new Error(`Unhandled response error: ${error}`);
  }
};

export const getResponseForError = (error: ResponseError): BackendResponse => ({
  error,
  message: getMessageForError(error),
});

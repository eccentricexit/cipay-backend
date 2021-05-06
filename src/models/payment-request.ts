import { Model, Schema, model } from 'mongoose';
import { PaymentRequestStatus } from '../types';
import TimeStampPlugin, {
  ITimeStampedDocument,
} from './plugins/timestamp-plugin';

export interface IPaymentRequest extends ITimeStampedDocument {
  /** Pix brcode to be paid. */
  brcode: string;
  /** The address of the party making the payment in crypto. */
  payerAddr: string;
  /** The currency the payer sent to cipay. */
  coin: string;
  /** The coin/BRL rate agreed upon. The smallest denominator is used for both sides of the pair.*/
  rate: string;
  /** The current state of the payment. */
  status: PaymentRequestStatus;
  /** The transaction hash of the token transfer. */
  txHash: string;
  /** The tax ID (CPF or CNPJ) of the receiver */
  receiverTaxId: string;
  /** Payment description */
  description: string;
  /** The number of BRL cents asked in the brcode */
  brcodeAmount: number;
  /** The starkbank payment id, if any */
  starkbankPaymentId: string;
  /** The last status reported by starkbank */
  brcodeStatus: string;
}

type IPaymentRequestModel = Model<IPaymentRequest>;

const schema = new Schema<IPaymentRequest>({
  brcode: { type: String, index: true, required: true, unique: true },
  payerAddr: { type: String, index: true, required: true },
  coin: { type: String, index: true, required: true },
  rate: { type: String, required: true },
  status: { type: String, index: true, required: true },
  txHash: { type: String, index: true, sparse: true },
  receiverTaxId: { type: String, index: true, required: true },
  description: { type: String },
  brcodeAmount: { type: Number, required: true },
  starkbankPaymentId: {
    type: String,
    index: true,
    unique: true,
    sparse: true
  },
  brcodeStatus: { type: String, index: true },
});

// Add timestamp plugin for createdAt and updatedAt in miliseconds from epoch
schema.plugin(TimeStampPlugin);

const PaymentRequest: IPaymentRequestModel = model<
  IPaymentRequest,
  IPaymentRequestModel
>('PaymentRequest', schema);

export default PaymentRequest;

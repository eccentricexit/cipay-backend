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
}

type IPaymentRequestModel = Model<IPaymentRequest>;

const schema = new Schema<IPaymentRequest>({
  brcode: { type: String, index: true, required: true },
  payerAddr: { type: String, index: true, required: true },
  coin: { type: String, index: true, required: true },
  rate: { type: String, index: true, required: true },
  status: { type: String, index: true, required: true },
});

// Add timestamp plugin for createdAt and updatedAt in miliseconds from epoch
schema.plugin(TimeStampPlugin);

const PaymentRequest: IPaymentRequestModel = model<
  IPaymentRequest,
  IPaymentRequestModel
>('PaymentRequest', schema);

export default PaymentRequest;

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentDocument = Payment & Document;

export enum PaymentMethod {
  VNPAY = 'vnpay',
  MOMO = 'momo',
  ZALOPAY = 'zalopay',
  CASH = 'cash',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

@Schema({ collection: 'payments', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Payment {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order', required: true, index: true })
  order_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user_id: Types.ObjectId;

  @Prop({ type: String, enum: PaymentMethod, required: true })
  payment_method: PaymentMethod;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: 'VND' })
  currency: string;

  @Prop({ required: true, unique: true })
  idempotency_key: string;

  @Prop({ type: String, default: null })
  gateway_transaction_id: string | null;


  @Prop({ type: Object, default: {} })
  gateway_response: Record<string, any>;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Prop({ default: 0 })
  refund_amount: number;

  @Prop({ type: String, default: null })
  refund_reason: string | null;


  @Prop({ type: Date, default: null })
  refunded_at: Date | null;


  @Prop({ type: Date, default: null })
  completed_at: Date | null;

  created_at: Date;
  updated_at: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

PaymentSchema.index({ order_id: 1, created_at: -1 });
PaymentSchema.index({ idempotency_key: 1 }, { unique: true });
PaymentSchema.index({ order_id: 1, payment_method: 1, created_at: -1 });
PaymentSchema.index({ user_id: 1, created_at: -1 });
PaymentSchema.index({ status: 1, created_at: -1 });
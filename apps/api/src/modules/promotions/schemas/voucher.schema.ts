import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VoucherDocument = Voucher & Document;

@Schema({ collection: 'vouchers', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Voucher {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Promotion', required: true, index: true })
  promotion_id: Types.ObjectId;

  // để list nhanh theo merchant; nếu platform voucher thì null
  @Prop({ type: Types.ObjectId, ref: 'Merchant', default: null, index: true })
  merchant_id: Types.ObjectId | null;

  @Prop({ required: true, unique: true, uppercase: true, trim: true, index: true })
  code: string;

  @Prop({ default: 0 })
  total_usage_limit: number;

  @Prop({ default: 0 })
  per_user_limit: number;

  @Prop({ default: 0 })
  current_usage: number;

  @Prop({ default: true, index: true })
  is_active: boolean;

  // Optional: nếu bạn muốn voucher có khung giờ riêng (nếu không cần thì bỏ 2 field này)
  @Prop({ type: Date, default: null, index: true })
  start_date: Date | null;

  @Prop({ type: Date, default: null, index: true })
  end_date: Date | null;

  created_at: Date;
  updated_at: Date;
}

export const VoucherSchema = SchemaFactory.createForClass(Voucher);

VoucherSchema.index({ merchant_id: 1, is_active: 1, created_at: -1 });
VoucherSchema.index({ promotion_id: 1, is_active: 1 });
VoucherSchema.index({ start_date: 1, end_date: 1, is_active: 1 });
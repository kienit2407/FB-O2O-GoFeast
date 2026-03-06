import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TableSessionDocument = TableSession & Document;

export enum TableSessionStatus {
  ACTIVE = 'active',
  CLOSING = 'closing',     // ✅ xin bill
  COMPLETED = 'completed', // ✅ đã thanh toán
  CANCELLED = 'cancelled',
}


@Schema({ collection: 'table_sessions', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class TableSession {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Table', required: true })
  table_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true })
  merchant_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  customer_id: Types.ObjectId | null;

  @Prop()
  guest_name: string;

  @Prop({ type: String, enum: TableSessionStatus, default: TableSessionStatus.ACTIVE })
  status: TableSessionStatus;

  @Prop({ default: () => new Date() })
  started_at: Date;

  @Prop({ type: Date, default: null })
  ended_at: Date | null;

  @Prop({ default: 0 })
  total_amount: number;

  created_at: Date;
  updated_at: Date;
}

export const TableSessionSchema = SchemaFactory.createForClass(TableSession);

TableSessionSchema.index({ merchant_id: 1, started_at: -1 });

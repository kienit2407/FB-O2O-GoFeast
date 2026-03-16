import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TableDocument = Table & Document;

export enum TableStatus {
  AVAILABLE = 'available',
  OCCUPIED = 'occupied',
  RESERVED = 'reserved',
}

@Schema({
  collection: 'tables',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class Table {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true })
  merchant_id: Types.ObjectId;

  @Prop({ required: true, trim: true })
  table_number: string;

  @Prop({ type: String, default: null })
  name?: string | null;

  @Prop({ type: Number, default: 0 })
  capacity: number;

  @Prop({ type: String, default: null })
  qr_content?: string | null;

  @Prop({ type: String, enum: TableStatus, default: TableStatus.AVAILABLE })
  status: TableStatus;

  @Prop({ type: Types.ObjectId, ref: 'TableSession', default: null })
  current_session_id?: Types.ObjectId | null;

  @Prop({ type: Boolean, default: true })
  is_active: boolean;

  @Prop({ type: Date, default: null })
  deleted_at?: Date | null;

  created_at: Date;
  updated_at: Date;
}

export const TableSchema = SchemaFactory.createForClass(Table);

TableSchema.index({ current_session_id: 1 });
TableSchema.index(
  { merchant_id: 1, table_number: 1 },
  {
    unique: true,
    partialFilterExpression: { deleted_at: null },
  },
);
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({ collection: 'categories', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Category {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true })
  merchant_id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ default: 0 })
  sort_order: number;

  @Prop({ default: true })
  is_active: boolean;

  @Prop({ type: Date, default: null })
  deleted_at: Date | null;

  created_at: Date;
  updated_at: Date;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

CategorySchema.index({ merchant_id: 1, is_active: 1 });

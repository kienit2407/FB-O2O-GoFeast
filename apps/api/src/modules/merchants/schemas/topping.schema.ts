import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ToppingDocument = HydratedDocument<Topping>;

@Schema({ collection: 'toppings', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Topping {
  @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true, index: true })
  merchant_id: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, default: null })
  description?: string | null;

  @Prop({ type: Number, required: true, min: 0 })
  price: number;

  @Prop({ type: Boolean, default: true })
  is_available: boolean;
  @Prop({ type: String, default: null })
  image_url: string | null;

  @Prop({ type: String, default: null })
  image_public_id: string | null;
  @Prop({ type: Boolean, default: true })
  is_active: boolean;

  @Prop({ type: Number, default: 0 })
  sort_order: number;

  // quan trọng: union => phải chỉ rõ type
  @Prop({ type: Number, default: 1, min: 1 })
  max_quantity: number;

  @Prop({ type: Date, default: null })
  deleted_at?: Date | null;
}

export const ToppingSchema = SchemaFactory.createForClass(Topping);
ToppingSchema.index({ merchant_id: 1, is_available: 1 });
ToppingSchema.index({ merchant_id: 1, is_active: 1, sort_order: 1 });

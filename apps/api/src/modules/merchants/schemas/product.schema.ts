import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductDocument = Product & Document;

export class ProductImage {
  url: string;
  public_id: string;
  position: number;
}

@Schema({ collection: 'products', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Product {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true })
  merchant_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  category_id: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ type: String, default: null, index: true })
  name_search: string | null;
  
  @Prop({ default: '' })
  description: string;

  // ✅ ONLY SOURCE OF TRUTH
  @Prop({
    type: [
      {
        url: { type: String, required: true },
        public_id: { type: String, required: true },
        position: { type: Number, default: 0 },
      },
    ],
    default: [],
  })
  images: ProductImage[];

  @Prop({ required: true, min: 0 })
  base_price: number;

  @Prop({ default: 0 })
  sale_price: number;

  @Prop({ default: true })
  is_available: boolean;

  @Prop({ default: true })
  is_active: boolean;

  @Prop({ default: 0 })
  sort_order: number;

  @Prop({ default: 0 })
  total_sold: number;

  @Prop({ default: 0 })
  average_rating: number;

  @Prop({ default: 0 })
  total_reviews: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Topping' }], default: [] })
  topping_ids: Types.ObjectId[];

  @Prop({ type: Date, default: null })
  deleted_at: Date | null;

  created_at: Date;
  updated_at: Date;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({ merchant_id: 1, is_active: 1 });
ProductSchema.index({ category_id: 1, is_active: 1 });
ProductSchema.index({ topping_ids: 1 });
ProductSchema.index({ 'images.public_id': 1 });
ProductSchema.index({ name_search: 1, merchant_id: 1, is_active: 1, deleted_at: 1 });
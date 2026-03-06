import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PromotionDocument = Promotion & Document;

export enum PromotionCreatedByType {
  PLATFORM = 'platform',
  MERCHANT = 'merchant',
}

export enum PromotionScope {
  FOOD = 'food',
  DELIVERY = 'delivery',
  DINE_IN = 'dine_in',
}

export enum PromotionType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
}

export enum PromotionApplyLevel {
  ORDER = 'order',
  PRODUCT = 'product',
  CATEGORY = 'category',
  SHIPPING = 'shipping',
}

@Schema({ _id: false })
export class PromotionConditions {
  @Prop({ type: Date })
  valid_from?: Date;

  @Prop({ type: Date })
  valid_to?: Date;
}
export const PromotionConditionsSchema = SchemaFactory.createForClass(PromotionConditions);

@Schema({
  collection: 'promotions',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class Promotion {
  _id: Types.ObjectId;

  @Prop({ type: String, enum: PromotionCreatedByType, required: true, index: true })
  created_by_type: PromotionCreatedByType;

  @Prop({ type: Types.ObjectId, ref: 'Merchant', default: null, index: true })
  merchant_id: Types.ObjectId | null;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ type: String, enum: PromotionScope, required: true, index: true })
  scope: PromotionScope;

  @Prop({ type: String, enum: PromotionType, required: true })
  type: PromotionType;

  @Prop({
    type: String,
    enum: PromotionApplyLevel,
    default: PromotionApplyLevel.ORDER,
    index: true,
  })
  apply_level: PromotionApplyLevel;

  // targets (chỉ dùng khi PRODUCT/CATEGORY)
  @Prop({ type: [Types.ObjectId], default: [] })
  product_ids: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], default: [] })
  category_ids: Types.ObjectId[];

  @Prop({ required: true, min: 0 })
  discount_value: number;

  @Prop({ default: 0, min: 0 })
  max_discount: number;

  @Prop({ default: 0, min: 0 })
  min_order_amount: number;

  @Prop({ type: PromotionConditionsSchema, default: {} })
  conditions: PromotionConditions;

  // giới hạn sử dụng (optional)
  @Prop({ default: 0, min: 0 })
  total_usage_limit: number;

  @Prop({ default: 0, min: 0 })
  per_user_limit: number;

  @Prop({ default: 0, min: 0 })
  current_usage: number;
  // ====== ✅ Admin banner (Super Admin) ======
  @Prop({ type: String, default: null })
  banner_admin_url: string | null;

  @Prop({ type: String, default: null })
  banner_admin_public_id: string | null;

  // ====== ✅ Admin-only flag ======
  @Prop({ default: false, index: true })
  show_push_noti: boolean;

  // banner
  @Prop({ type: String, default: null })
  banner_image_url: string | null;

  @Prop({ type: String, default: null })
  banner_image_public_id: string | null;

  // flags
  @Prop({ default: true, index: true })
  is_active: boolean;

  @Prop({ default: false, index: true })
  show_as_popup: boolean;

  created_at: Date;
  updated_at: Date;
}

export const PromotionSchema = SchemaFactory.createForClass(Promotion);

// ===== Indexes (gọn + đúng nhu cầu list/filter) =====
PromotionSchema.index({ created_by_type: 1, merchant_id: 1, is_active: 1, created_at: -1 });
PromotionSchema.index({ merchant_id: 1, apply_level: 1, is_active: 1, created_at: -1 });
PromotionSchema.index({ merchant_id: 1, show_as_popup: 1, is_active: 1, created_at: -1 });
PromotionSchema.index({ 'conditions.valid_from': 1, 'conditions.valid_to': 1 });

// multikey index giúp query theo target (nếu có apply theo product/category nhiều)
PromotionSchema.index({ product_ids: 1 });
PromotionSchema.index({ category_ids: 1 });
PromotionSchema.index({ created_by_type: 1, show_push_noti: 1, is_active: 1, created_at: -1 });
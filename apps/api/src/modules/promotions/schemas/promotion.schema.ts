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

/**
 * NEW
 * promo tự áp hay phải nhập code/voucher mới áp
 */
export enum PromotionActivationType {
  AUTO = 'auto',
  VOUCHER = 'voucher',
}

/**
 * NEW
 * áp cho loại order nào
 */
export enum PromotionOrderType {
  DELIVERY = 'delivery',
  DINE_IN = 'dine_in',
}

/**
 * NEW
 * tránh import chéo Payment schema/order schema
 */
export enum PromotionPaymentMethod {
  VNPAY = 'vnpay',
  MOMO = 'momo',
  ZALOPAY = 'zalopay',
  CASH = 'cash',
}

@Schema({ _id: false })
export class PromotionConditions {
  @Prop({ type: Date })
  valid_from?: Date;

  @Prop({ type: Date })
  valid_to?: Date;
}
export const PromotionConditionsSchema =
  SchemaFactory.createForClass(PromotionConditions);

@Schema({
  collection: 'promotions',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class Promotion {
  _id: Types.ObjectId;

  @Prop({
    type: String,
    enum: PromotionCreatedByType,
    required: true,
    index: true,
  })
  created_by_type: PromotionCreatedByType;

  @Prop({
    type: Types.ObjectId,
    ref: 'Merchant',
    default: null,
    index: true,
  })
  merchant_id: Types.ObjectId | null;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({
    type: String,
    enum: PromotionScope,
    required: true,
    index: true,
  })
  scope: PromotionScope;

  @Prop({
    type: String,
    enum: PromotionType,
    required: true,
  })
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

  // giới hạn sử dụng
  @Prop({ default: 0, min: 0 })
  total_usage_limit: number;

  @Prop({ default: 0, min: 0 })
  per_user_limit: number;

  @Prop({ default: 0, min: 0 })
  current_usage: number;

  // ===== NEW: checkout-friendly =====

  /**
   * auto = tự áp
   * voucher = chỉ áp khi user nhập code
   */
  @Prop({
    type: String,
    enum: PromotionActivationType,
    default: PromotionActivationType.AUTO,
    index: true,
  })
  activation_type: PromotionActivationType;

  /**
   * dùng để sort / tie-break khi có nhiều promo hợp lệ
   * số càng lớn càng ưu tiên
   */
  @Prop({ type: Number, default: 0, index: true })
  priority: number;

  /**
   * promo này có được đi cùng voucher khác không
   * business rule hiện tại của bạn có thể để true mặc định
   */
  @Prop({ type: Boolean, default: true })
  can_stack_with_voucher: boolean;

  /**
   * promo áp cho delivery, dine_in hay cả hai
   * [] = không giới hạn
   */
  @Prop({
    type: [String],
    enum: Object.values(PromotionOrderType),
    default: [],
  })
  allowed_order_types: PromotionOrderType[];

  /**
   * promo chỉ áp với 1 số payment methods nhất định
   * [] = không giới hạn
   */
  @Prop({
    type: [String],
    enum: Object.values(PromotionPaymentMethod),
    default: [],
  })
  allowed_payment_methods: PromotionPaymentMethod[];

  /**
   * nhóm loại trừ để engine chọn best promo trong cùng sponsor
   * ví dụ:
   * - food_line
   * - food_order
   * - shipping
   *
   * BE có thể xử lý:
   * same sponsor + same exclusive_group => lấy best
   * different sponsor => vẫn stack
   */
  @Prop({ type: String, default: null, index: true })
  exclusive_group: string | null;

  // ======  Admin banner (Super Admin) ======
  @Prop({ type: String, default: null })
  banner_admin_url: string | null;

  @Prop({ type: String, default: null })
  banner_admin_public_id: string | null;

  // ======  Admin-only flag ======
  @Prop({ default: false, index: true })
  show_push_noti: boolean;
  @Prop({ type: String, default: null })
  push_noti_title: string | null;

  @Prop({ type: String, default: null })
  push_noti_body: string | null;

  @Prop({ type: Date, default: null, index: true })
  push_sent_at: Date | null;
  // flags
  @Prop({ default: true, index: true })
  is_active: boolean;

  @Prop({ default: false, index: true })
  show_as_popup: boolean;

  created_at: Date;
  updated_at: Date;
}

export const PromotionSchema = SchemaFactory.createForClass(Promotion);

// ===== Indexes cũ =====
PromotionSchema.index({
  created_by_type: 1,
  merchant_id: 1,
  is_active: 1,
  created_at: -1,
});

PromotionSchema.index({
  merchant_id: 1,
  apply_level: 1,
  is_active: 1,
  created_at: -1,
});

PromotionSchema.index({
  merchant_id: 1,
  show_as_popup: 1,
  is_active: 1,
  created_at: -1,
});

PromotionSchema.index({
  'conditions.valid_from': 1,
  'conditions.valid_to': 1,
});

PromotionSchema.index({ product_ids: 1 });
PromotionSchema.index({ category_ids: 1 });

PromotionSchema.index({
  created_by_type: 1,
  show_push_noti: 1,
  is_active: 1,
  created_at: -1,
});

// ===== NEW indexes checkout =====
PromotionSchema.index({
  activation_type: 1,
  is_active: 1,
  created_by_type: 1,
  merchant_id: 1,
  scope: 1,
  apply_level: 1,
  priority: -1,
});

PromotionSchema.index({
  created_by_type: 1,
  exclusive_group: 1,
  is_active: 1,
  priority: -1,
});
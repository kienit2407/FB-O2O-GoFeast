import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PromotionUsageDocument = PromotionUsage & Document;

@Schema({
    collection: 'promotion_usages',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class PromotionUsage {
    _id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
    user_id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Promotion', required: true, index: true })
    promotion_id: Types.ObjectId;

    // denormalize để đối chiếu merchant detail nhanh hơn
    @Prop({ type: Types.ObjectId, ref: 'Merchant', default: null, index: true })
    merchant_id: Types.ObjectId | null;

    @Prop({ type: String, default: null })
    sponsor: string | null;

    @Prop({ type: String, default: null })
    scope: string | null;

    @Prop({ type: String, default: null })
    apply_level: string | null;

    @Prop({ type: String, default: null })
    activation_type: string | null;

    @Prop({ type: Number, default: 0 })
    used_count: number;

    @Prop({ type: Date, default: null })
    first_used_at: Date | null;

    @Prop({ type: Date, default: null })
    last_used_at: Date | null;

    @Prop({ type: Types.ObjectId, ref: 'Order', default: null })
    last_used_order_id: Types.ObjectId | null;

    @Prop({ type: String, default: null })
    last_used_order_type: string | null;

    created_at: Date;
    updated_at: Date;
}

export const PromotionUsageSchema =
    SchemaFactory.createForClass(PromotionUsage);

PromotionUsageSchema.index({ user_id: 1, promotion_id: 1 }, { unique: true });
PromotionUsageSchema.index({ user_id: 1, merchant_id: 1, updated_at: -1 });
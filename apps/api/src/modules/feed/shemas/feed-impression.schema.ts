import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FeedImpressionDocument = FeedImpression & Document;

export enum FeedSectionKey {
    FOOD_FOR_YOU = 'food_for_you',
    PEOPLE_LOVE = 'people_love',
    RESTAURANTS_YOU_MAY_LIKE = 'restaurants_you_may_like',
    AI_RECOMMENDED_PRODUCTS = 'ai_recommended_products',
}

export enum FeedItemType {
    MERCHANT = 'merchant',
    PRODUCT = 'product',
}

@Schema({
    collection: 'feed_impressions',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class FeedImpression {
    _id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
    user_id: Types.ObjectId;

    @Prop({ type: String, required: true, index: true })
    request_id: string;

    @Prop({ type: String, default: null })
    session_id?: string | null;

    @Prop({ type: String, enum: FeedSectionKey, required: true, index: true })
    section: FeedSectionKey;

    @Prop({ type: String, enum: FeedItemType, required: true })
    item_type: FeedItemType;

    @Prop({ type: Types.ObjectId, required: true, index: true })
    item_id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Merchant', default: null })
    merchant_id?: Types.ObjectId | null;

    @Prop({ type: Number, required: true })
    position: number;

    @Prop({ type: String, required: true })
    geo_cell: string;

    @Prop({ type: Number, default: null })
    distance_km?: number | null;

    @Prop({ type: Number, default: null })
    score?: number | null;

    @Prop({ type: String, default: 'heuristic_v1' })
    model_version: string;

    @Prop({ type: Date, required: true, index: true })
    shown_at: Date;

    created_at: Date;
    updated_at: Date;
}

export const FeedImpressionSchema = SchemaFactory.createForClass(FeedImpression);

// Indexes theo spec
FeedImpressionSchema.index({ user_id: 1, shown_at: -1 });
FeedImpressionSchema.index({ item_id: 1, shown_at: -1 });
FeedImpressionSchema.index({ request_id: 1 });

// TTL (tuỳ chọn): giữ 90 ngày
FeedImpressionSchema.index(
    { created_at: 1 },
    { expireAfterSeconds: 90 * 24 * 60 * 60 },
);

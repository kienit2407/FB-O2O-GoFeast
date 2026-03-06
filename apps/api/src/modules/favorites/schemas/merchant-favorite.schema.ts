// src/modules/favorites/schemas/merchant-favorite.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MerchantFavoriteDocument = MerchantFavorite & Document;

@Schema({
    collection: 'merchant_favorites',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class MerchantFavorite {
    _id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
    user_id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true, index: true })
    merchant_id: Types.ObjectId;

    @Prop({ type: Date, default: null, index: true })
    deleted_at: Date | null;

    created_at: Date;
    updated_at: Date;
}

export const MerchantFavoriteSchema = SchemaFactory.createForClass(MerchantFavorite);

// 1 user chỉ favorite 1 merchant 1 lần
MerchantFavoriteSchema.index({ user_id: 1, merchant_id: 1 }, { unique: true });
MerchantFavoriteSchema.index({ user_id: 1, deleted_at: 1, created_at: -1 });
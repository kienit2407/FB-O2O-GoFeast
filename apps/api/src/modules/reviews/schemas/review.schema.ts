import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReviewDocument = Review & Document;

@Schema({ _id: false })
class ReviewImage {
    @Prop({ type: String, required: true })
    url: string;

    @Prop({ type: String, default: null })
    public_id: string | null;
}

@Schema({ _id: false })
class MerchantReply {
    @Prop({ type: String, trim: true, required: true })
    content: string;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    merchant_user_id: Types.ObjectId;

    @Prop({ type: Boolean, default: false })
    is_edited: boolean;

    @Prop({ type: Date, default: Date.now })
    replied_at: Date;

    @Prop({ type: Date, default: Date.now })
    updated_at: Date;
}

const ReviewImageSchema = SchemaFactory.createForClass(ReviewImage);
const MerchantReplySchema = SchemaFactory.createForClass(MerchantReply);

@Schema({
    collection: 'reviews',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class Review {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
    user_id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true, index: true })
    merchant_id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
    product_id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Order', required: true, index: true })
    order_id: Types.ObjectId;

    @Prop({ type: Number, required: true, min: 1, max: 5 })
    rating: number;

    @Prop({ type: [ReviewImageSchema], default: [] })
    images: ReviewImage[];

    @Prop({ type: String, trim: true, default: '' })
    comment: string;

    @Prop({ type: String, default: null })
    video_url: string | null;

    @Prop({ type: String, default: null })
    video_public_id: string | null;

    @Prop({ type: Boolean, default: false })
    is_edited: boolean;

    @Prop({ type: MerchantReplySchema, default: null })
    merchant_reply: MerchantReply | null;

    @Prop({ type: Date, default: null, index: true })
    deleted_at: Date | null;

    created_at: Date;
    updated_at: Date;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

ReviewSchema.index({ order_id: 1, product_id: 1 }, { unique: true });
ReviewSchema.index({ merchant_id: 1, created_at: -1 });
ReviewSchema.index({ product_id: 1, created_at: -1 });
ReviewSchema.index({ user_id: 1, created_at: -1 });
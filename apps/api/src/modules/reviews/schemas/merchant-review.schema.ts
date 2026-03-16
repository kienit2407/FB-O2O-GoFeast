import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MerchantReviewDocument = MerchantReview & Document;

@Schema({ _id: false })
class MerchantReviewImage {
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

const MerchantReviewImageSchema =
    SchemaFactory.createForClass(MerchantReviewImage);
const MerchantReplySchema = SchemaFactory.createForClass(MerchantReply);

@Schema({
    collection: 'merchant_reviews',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class MerchantReview {
    @Prop({ type: Types.ObjectId, ref: 'Order', required: true, index: true })
    order_id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
    customer_id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true, index: true })
    merchant_id: Types.ObjectId;

    @Prop({ type: Number, required: true, min: 1, max: 5 })
    rating: number;

    @Prop({ type: String, trim: true, default: '' })
    comment: string;

    @Prop({ type: [MerchantReviewImageSchema], default: [] })
    images: MerchantReviewImage[];

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

export const MerchantReviewSchema =
    SchemaFactory.createForClass(MerchantReview);

MerchantReviewSchema.index(
    { order_id: 1, customer_id: 1 },
    { unique: true },
);
MerchantReviewSchema.index({ merchant_id: 1, created_at: -1 });
MerchantReviewSchema.index({ customer_id: 1, created_at: -1 });
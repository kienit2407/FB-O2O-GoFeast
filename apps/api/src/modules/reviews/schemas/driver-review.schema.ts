import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DriverReviewDocument = DriverReview & Document;

@Schema({ _id: false })
class DriverReviewImage {
    @Prop({ type: String, required: true })
    url: string;

    @Prop({ type: String, default: null })
    public_id: string | null;
}

const DriverReviewImageSchema =
    SchemaFactory.createForClass(DriverReviewImage);

@Schema({
    collection: 'driver_reviews',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class DriverReview {
    @Prop({ type: Types.ObjectId, ref: 'Order', required: true, index: true })
    order_id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
    customer_id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
    driver_user_id: Types.ObjectId;

    @Prop({ type: Number, required: true, min: 1, max: 5 })
    rating: number;

    @Prop({ type: String, trim: true, default: '' })
    comment: string;

    @Prop({ type: [DriverReviewImageSchema], default: [] })
    images: DriverReviewImage[];

    @Prop({ type: String, default: null })
    video_url: string | null;

    @Prop({ type: String, default: null })
    video_public_id: string | null;

    @Prop({ type: Boolean, default: false })
    is_edited: boolean;

    @Prop({ type: Date, default: null, index: true })
    deleted_at: Date | null;

    created_at: Date;
    updated_at: Date;
}

export const DriverReviewSchema = SchemaFactory.createForClass(DriverReview);

DriverReviewSchema.index(
    { order_id: 1, customer_id: 1 },
    { unique: true },
);
DriverReviewSchema.index({ driver_user_id: 1, created_at: -1 });
DriverReviewSchema.index({ customer_id: 1, created_at: -1 });
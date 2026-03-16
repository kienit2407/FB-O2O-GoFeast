
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

export enum NotificationType {
  ORDER_CREATED = 'order_created',
  ORDER_STATUS = 'order_status',
  ORDER_ASSIGNED = 'order_assigned',
  ORDER_OFFER = 'order_offer',
  ORDER_CANCELLED = 'order_cancelled',

  MERCHANT_APPROVAL = 'merchant_approval',
  DRIVER_APPROVAL = 'driver_approval',

  PROMOTION = 'promotion',
  SYSTEM = 'system',

  REVIEW_RECEIVED = 'review_received',
  REVIEW_REPLIED = 'review_replied',
}

export enum NotificationRecipientRole {
  CUSTOMER = 'customer',
  DRIVER = 'driver',
  MERCHANT = 'merchant',
  ADMIN = 'admin',
}

export type NotificationReviewType = 'merchant' | 'product' | 'driver';
@Schema({
  collection: 'notifications',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class Notification {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user_id: Types.ObjectId;

  @Prop({
    type: String,
    enum: NotificationRecipientRole,
    required: true,
    index: true,
  })
  recipient_role: NotificationRecipientRole;

  @Prop({ type: String, enum: NotificationType, required: true, index: true })
  type: NotificationType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  body: string;

  @Prop({
    type: {
      action: String,
      order_id: Types.ObjectId,
      order_number: String,
      image_url: String,
      merchant_id: Types.ObjectId,
      driver_id: Types.ObjectId,
      product_id: Types.ObjectId,
      review_id: Types.ObjectId,
      review_type: String,
      promotion_id: Types.ObjectId,
      table_number: String,
      order_type: String,
    },
    default: {},
  })
  data: {
    action?: string;
    order_id?: Types.ObjectId;
    order_number?: string;
    merchant_id?: Types.ObjectId;
    driver_id?: Types.ObjectId;
    product_id?: Types.ObjectId;
    image_url?: string;
    review_id?: Types.ObjectId;
    review_type?: NotificationReviewType;
    promotion_id?: Types.ObjectId;
    table_number?: string;
    order_type?: string;
  };
  @Prop({ default: false, index: true })
  is_read: boolean;

  @Prop({ type: Date, default: null })
  read_at?: Date | null;

  created_at: Date;
  updated_at: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ user_id: 1, created_at: -1 });
NotificationSchema.index({ user_id: 1, is_read: 1, created_at: -1 });
NotificationSchema.index({ recipient_role: 1, created_at: -1 });
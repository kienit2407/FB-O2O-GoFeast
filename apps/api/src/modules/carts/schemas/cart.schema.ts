import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { CartItem, CartItemSchema } from './cart-item.schema';

export type CartDocument = Cart & Document;

export enum CartStatus {
  ACTIVE = 'active',
  ABANDONED = 'abandoned',
}

export enum OrderType {
  DELIVERY = 'delivery',
  DINE_IN = 'dine_in',
}

@Schema({
  collection: 'carts',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class Cart {
  _id: Types.ObjectId;

  //  delivery: phải có user_id (enforce ở service)
  //  dine_in: guest => user_id = null
  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  user_id: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true, index: true })
  merchant_id: Types.ObjectId;

  @Prop({ type: String, enum: OrderType, required: true, index: true })
  order_type: OrderType;

  @Prop({ type: String, enum: CartStatus, default: CartStatus.ACTIVE, index: true })
  status: CartStatus;

  // dine-in context
  @Prop({ type: Types.ObjectId, ref: 'Table', default: null, index: true })
  table_id: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'TableSession', default: null, index: true })
  table_session_id: Types.ObjectId | null;

  //  items embedded
  @Prop({ type: [CartItemSchema], default: [] })
  items: CartItem[];

  // TTL cleanup
  @Prop({ type: Date, default: null, index: true })
  expires_at: Date | null;

  @Prop({ type: Date, default: () => new Date() })
  last_active_at: Date;

  @Prop({ type: Date, default: null })
  deleted_at: Date | null;

  created_at: Date;
  updated_at: Date;
}

export const CartSchema = SchemaFactory.createForClass(Cart);

/**
 * DELIVERY: 1 active cart / user / merchant
 */
CartSchema.index(
  { user_id: 1, merchant_id: 1, order_type: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: CartStatus.ACTIVE,
      order_type: OrderType.DELIVERY,
      user_id: { $type: 'objectId' },
    },
  },
);

/**
 * DINE_IN: 1 active cart / table_session / merchant
 */
CartSchema.index(
  { table_session_id: 1, merchant_id: 1, order_type: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: CartStatus.ACTIVE,
      order_type: OrderType.DINE_IN,
      table_session_id: { $type: 'objectId' },
    },
  },
);

// TTL
CartSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrderDocument = Order & Document;

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY_FOR_PICKUP = 'ready_for_pickup',
  DRIVER_ASSIGNED = 'driver_assigned',
  DRIVER_ARRIVED = 'driver_arrived',
  PICKED_UP = 'picked_up',
  DELIVERING = 'delivering',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  SERVED = 'served',
}

export enum OrderType {
  DELIVERY = 'delivery',
  DINE_IN = 'dine_in',
}

export enum PaymentMethod {
  VNPAY = 'vnpay',
  MOMO = 'momo',
  ZALOPAY = 'zalopay',
  CASH = 'cash',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

//  thêm: item union type
export enum OrderItemType {
  PRODUCT = 'product',
  TOPPING = 'topping',
}

@Schema({
  collection: 'orders',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class Order {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true })
  order_number: string;

  @Prop({ type: String, enum: OrderType, required: true })
  order_type: OrderType;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  customer_id: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true })
  merchant_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  driver_id: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'TableSession', default: null })
  table_session_id: Types.ObjectId | null;

  @Prop({
    type: [
      {
        _id: Types.ObjectId,

        //  NEW: item union
        item_type: { type: String, enum: Object.values(OrderItemType), default: OrderItemType.PRODUCT },
        topping_id: Types.ObjectId,
        topping_name: String,

        // product fields (giữ nguyên)
        product_id: Types.ObjectId,
        product_name: String,
        product_image: String,

        quantity: Number,
        base_price: Number,
        unit_price: Number,

        selected_options: {
          type: [
            {
              option_name: String,
              choice_name: String,
              price_modifier: Number,
            },
          ],
          default: [],
        },

        //  NEW: toppings đi kèm product (nằm trong item product)
        selected_toppings: {
          type: [
            {
              topping_id: Types.ObjectId,
              topping_name: String,
              quantity: Number,
              unit_price: Number,
            },
          ],
          default: [],
        },

        note: String,
        item_total: Number,
      },
    ],
    default: [],
  })
  items: (
    | {
      _id: Types.ObjectId;

      //  union
      item_type: OrderItemType;

      // product item
      product_id: Types.ObjectId;
      product_name: string;
      product_image: string;

      // toppings đi kèm product
      selected_toppings: {
        topping_id: Types.ObjectId;
        topping_name: string;
        quantity: number;
        unit_price: number;
      }[];

      // common
      quantity: number;
      base_price: number;
      unit_price: number;

      selected_options: {
        option_name: string;
        choice_name: string;
        price_modifier: number;
      }[];

      note: string;
      item_total: number;
    }
    | {
      _id: Types.ObjectId;

      //  union
      item_type: OrderItemType;

      // topping standalone item
      topping_id: Types.ObjectId;
      topping_name: string;

      // common
      quantity: number;
      base_price: number;
      unit_price: number;

      // giữ field cũ cho đồng nhất (có thể để [])
      selected_options: {
        option_name: string;
        choice_name: string;
        price_modifier: number;
      }[];

      // giữ field cũ cho đồng nhất (có thể để [])
      selected_toppings: {
        topping_id: Types.ObjectId;
        topping_name: string;
        quantity: number;
        unit_price: number;
      }[];

      note: string;
      item_total: number;
    }
  )[];

  @Prop({
    type: {
      address: String,
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number] },
      },
      receiver_name: String,
      receiver_phone: String,
      note: String,
    },
  })
  delivery_address?: {
    address: string;
    location: {
      type: string;
      coordinates: [number, number];
    };
    receiver_name: string;
    receiver_phone: string;
    note: string;
  };

  //  NEW: audit-friendly (before discount)
  @Prop({ default: 0 })
  subtotal_before_discount: number;

  //  NEW: audit-friendly (before discount)
  @Prop({ default: 0 })
  delivery_fee_before_discount: number;

  @Prop({ default: 0 })
  subtotal: number;

  @Prop({ default: 0 })
  delivery_fee: number;

  @Prop({ type: String })
  order_note?: string;
  @Prop({ type: Date, default: null })
  driver_arrived_at: Date | null;
  @Prop({ default: 0 })
  platform_fee: number;

  @Prop({
    type: {
      food_discount: Number,
      delivery_discount: Number,
      total_discount: Number,
    },
    default: {},
  })
  discounts: {
    food_discount?: number;
    delivery_discount?: number;
    total_discount?: number;
  };

  @Prop({
    type: [
      {
        voucher_id: Types.ObjectId,
        voucher_code: String,
        scope: String,
        sponsor: String,
        discount_amount: Number,
      },
    ],
    default: [],
  })
  applied_vouchers: {
    voucher_id: Types.ObjectId;
    voucher_code: string;
    scope: string;
    sponsor: string;
    discount_amount: number;
  }[];

  @Prop({ required: true })
  total_amount: number;

  @Prop({ type: String, enum: PaymentMethod })
  payment_method: PaymentMethod;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.PENDING })
  payment_status: PaymentStatus;

  @Prop({ type: Date, default: null }) // Khai báo rõ kiểu Date cho Mongoose
  paid_at?: Date;

  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Prop({
    type: [
      {
        status: String,
        changed_at: Date,
        changed_by: { type: Types.ObjectId, ref: 'User', default: null },
        note: String,
      },
    ],
    default: [],
  })
  status_history: {
    status: string;
    changed_at: Date;
    changed_by: Types.ObjectId | null;
    note: string;
  }[];

  @Prop({ type: Number })
  estimated_prep_time: number;

  @Prop({ type: Date, default: null })
  estimated_delivery_time: Date | null;

  @Prop({ default: false })
  is_rated: boolean;

  @Prop({ type: String, enum: ['customer', 'merchant', 'driver', 'system'], default: null })
  cancelled_by: string | null;

  @Prop({ type: String, default: null })
  cancel_reason: string | null;

  // Cũ: @Prop({ default: null })
  @Prop({ type: Date, default: null })
  driver_assigned_at: Date | null;

  @Prop({ type: [String], default: [] })
  proof_of_delivery_images: string[];

  @Prop({ type: Date, default: null })
  driver_accept_deadline_at: Date | null;

  @Prop({ default: 0 })
  assignment_attempts: number;

  @Prop({
    type: {
      merchant_gross: Number,
      merchant_commission_rate: Number,
      merchant_commission_amount: Number,
      merchant_net: Number,
      driver_gross: Number,
      driver_commission_rate: Number,
      driver_commission_amount: Number,
      driver_net: Number,
      platform_fee: Number,
      platform_revenue: Number,
      sponsor_cost: Number,
    },
    default: {},
  })
  settlement: {
    merchant_gross?: number;
    merchant_commission_rate?: number;
    merchant_commission_amount?: number;
    merchant_net?: number;
    driver_gross?: number;
    driver_commission_rate?: number;
    driver_commission_amount?: number;
    driver_net?: number;
    platform_fee?: number;
    platform_revenue?: number;
    sponsor_cost?: number;
  };

  created_at: Date;
  updated_at: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ 'delivery_address.location': '2dsphere' });
OrderSchema.index({ order_number: 1 }, { unique: true });
OrderSchema.index({ customer_id: 1, created_at: -1 });
OrderSchema.index({ merchant_id: 1, status: 1, created_at: -1 });
OrderSchema.index({ driver_id: 1, status: 1, created_at: -1 });
// customer-profile.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CustomerProfileDocument = CustomerProfile & Document;

@Schema({ _id: false })
class GeoPoint {
  @Prop({ type: String, enum: ['Point'], required: true })
  type: 'Point';

  @Prop({ type: [Number], required: true })
  coordinates: [number, number]; // [lng, lat]
}
const GeoPointSchema = SchemaFactory.createForClass(GeoPoint);

@Schema({ _id: false })
class CustomerLocation extends GeoPoint {
  @Prop({ type: String })
  address?: string;

  // ✅ thêm các field giống SavedAddress
  @Prop({ type: String, default: null })
  delivery_note?: string | null;

  @Prop({ type: String, default: null })
  receiver_name?: string | null;

  @Prop({ type: String, default: null })
  receiver_phone?: string | null;

  @Prop({ type: Date })
  updated_at?: Date;
}
const CustomerLocationSchema = SchemaFactory.createForClass(CustomerLocation);

@Schema({ _id: false })
class SavedAddress {
  @Prop({ type: Types.ObjectId, default: () => new Types.ObjectId() })
  _id: Types.ObjectId;

  @Prop({ type: String, required: true })
  address: string;

  @Prop({ type: GeoPointSchema, required: false })
  location?: GeoPoint;

  @Prop({ type: String, default: null })
  delivery_note?: string | null;

  @Prop({ type: String, default: null })
  receiver_name?: string | null;

  @Prop({ type: String, default: null })
  receiver_phone?: string | null;

  @Prop({ type: Date })
  created_at?: Date;

  @Prop({ type: Date })
  updated_at?: Date;
}
const SavedAddressSchema = SchemaFactory.createForClass(SavedAddress);

@Schema({
  collection: 'customer_profiles',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class CustomerProfile {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  user_id: Types.ObjectId;

  @Prop({ type: CustomerLocationSchema, required: false })
  current_location?: CustomerLocation;

  @Prop({ type: [SavedAddressSchema], required: false })
  saved_addresses?: SavedAddress[];

  @Prop({ default: 0 })
  total_orders: number;

  @Prop({ default: 0 })
  total_spent: number;

  created_at: Date;
  updated_at: Date;
}

export const CustomerProfileSchema = SchemaFactory.createForClass(CustomerProfile);

CustomerProfileSchema.index({ user_id: 1 }, { unique: true });
CustomerProfileSchema.index({ current_location: '2dsphere' });
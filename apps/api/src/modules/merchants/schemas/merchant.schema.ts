import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MerchantDocument = Merchant & Document;

export enum MerchantApprovalStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
}

export enum StoreCategory {
  RESTAURANT = 'restaurant',
  COFFEE = 'coffee',
  FASTFOOD = 'fastfood',
  BBQ = 'bbq',
  DRINK = 'drink',
  DESSERT = 'dessert',
  OTHER = 'other',
}



@Schema({ collection: 'merchants', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class Merchant {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  owner_user_id: Types.ObjectId
  // FIX: Add explicit type for union types
  @Prop({ type: String, default: null })
  name: string | null;

  @Prop({ type: String, default: null })
  description: string | null;

  @Prop({ type: String, default: null })
  phone: string | null;

  @Prop()
  email: string;

  // REMOVE required - allow draft without category
  @Prop({ type: String, enum: StoreCategory, default: null })
  category: StoreCategory | null;

  @Prop({ type: String, default: null })
  logo_url: string | null;

  @Prop({ type: String, default: null })
  cover_image_url: string | null;


  @Prop({ type: String, default: null })
  logo_public_id: string | null;

  @Prop({ type: String, default: null })
  cover_image_public_id: string | null;

  //  REMOVE required - allow draft without address
  @Prop({ type: String, default: null })
  address: string | null;

  // Location - nullable, no defaults to avoid MongoDB GeoJSON validation error
  @Prop({
    type: {
      type: String,
      enum: ['Point']
    },
    coordinates: { type: [Number] }

  })
  location: {
    type: string;
    coordinates: [number, number];
  } | null;

  // Operating hours
  @Prop({
    type: [{
      day: Number,
      open_time: String,
      close_time: String,
      is_closed: Boolean
    }],
    default: []
  })
  business_hours: {
    day: number;
    open_time: string;
    close_time: string;
    is_closed: boolean;
  }[];
  @Prop({ type: String, default: null, index: true })
  name_search: string | null;
  // Order settings
  @Prop({ default: false })
  is_accepting_orders: boolean;


  @Prop()
  average_prep_time_min: number;

  @Prop()
  delivery_radius_km: number;

  // Approval / Moderation
  @Prop({ type: String, enum: MerchantApprovalStatus, default: MerchantApprovalStatus.DRAFT, index: true })
  approval_status: MerchantApprovalStatus;



  @Prop({ type: [String], default: [] })
  rejection_reasons: string[];

  @Prop({ type: String, default: null })
  rejection_note: string | null;


  // Onboarding
  @Prop({ default: 1 })
  onboarding_step: number;

  @Prop({ type: Date, default: null })
  submitted_at: Date | null;

  // Financial snapshot
  @Prop({ default: 0.2 })
  commission_rate: number;


  // Documents
  @Prop({
    type: {
      business_license_url: String,
      id_card_front_url: String,
      id_card_back_url: String,
      store_front_image_url: String
    },
    default: {}
  })
  documents: {
    business_license_url?: string;
    id_card_front_url?: string;
    id_card_back_url?: string;
    store_front_image_url?: string;
  };

  // Stats cache
  @Prop({ default: 0 })
  total_orders: number;

  @Prop({ default: 0 })
  average_rating: number;

  @Prop({ default: 0 })
  total_reviews: number;

  @Prop({ type: Date, default: null })
  deleted_at: Date | null;

  created_at: Date;
  updated_at: Date;
}

export const MerchantSchema = SchemaFactory.createForClass(Merchant);

MerchantSchema.index({ owner_user_id: 1 }, { unique: true });
MerchantSchema.index({ email: 1 }, { unique: true, sparse: true });  //  sparse for optional email
MerchantSchema.index({ location: '2dsphere' });
MerchantSchema.index({ approval_status: 1, is_accepting_orders: 1 });
MerchantSchema.index({ deleted_at: 1 });
MerchantSchema.index({ name_search: 1, approval_status: 1, deleted_at: 1 });
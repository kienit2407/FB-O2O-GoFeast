import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DriverProfileDocument = DriverProfile & Document;

export enum DriverVerificationStatus {
    DRAFT = 'draft',       // chưa nộp
    PENDING = 'pending',   // đã nộp - chờ duyệt
    APPROVED = 'approved',
    REJECTED = 'rejected',
}

export enum DriverLicenseType {
    A1 = 'A1',
    A2 = 'A2',
    B1 = 'B1',
    B2 = 'B2',
}

@Schema({ _id: false })
export class GeoPoint {
    @Prop({ type: String, enum: ['Point'], default: 'Point' })
    type: 'Point';

    @Prop({ type: [Number], default: undefined })
    coordinates?: [number, number]; // [lng, lat]
}
export const GeoPointSchema = SchemaFactory.createForClass(GeoPoint);

@Schema({
    collection: 'driver_profiles',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class DriverProfile {
    _id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
    user_id: Types.ObjectId;

    // ===== KYC =====
    @Prop({ type: String, default: null })
    id_card_number?: string | null;

    @Prop({ type: String, default: null })
    id_card_front_url?: string | null;

    @Prop({ type: String, default: null })
    id_card_back_url?: string | null;

    @Prop({ type: String, default: null })
    license_number?: string | null;

    @Prop({ type: String, enum: DriverLicenseType, default: null })
    license_type?: DriverLicenseType | null;

    @Prop({ type: String, default: null })
    license_image_url?: string | null;

    @Prop({ type: Date, default: null })
    license_expiry?: Date | null;

    @Prop({ type: String, default: null })
    vehicle_brand?: string | null;

    @Prop({ type: String, default: null })
    vehicle_model?: string | null;

    @Prop({ type: String, default: null })
    vehicle_plate?: string | null;

    @Prop({ type: String, default: null })
    vehicle_image_url?: string | null;

    // ===== Verification =====
    @Prop({
        type: String,
        enum: DriverVerificationStatus,
        default: DriverVerificationStatus.DRAFT,
        index: true,
    })
    verification_status: DriverVerificationStatus;

    @Prop({ type: [String], default: [] })
    verification_reasons: string[]; // list checkbox từ admin

    @Prop({ type: String, default: null })
    verification_note?: string | null;

    @Prop({ type: Date, default: null })
    submitted_at?: Date | null;

    @Prop({ type: Date, default: null })
    verified_at?: Date | null;

    @Prop({ type: Types.ObjectId, ref: 'User', default: null })
    verified_by?: Types.ObjectId | null;

    // ===== Driver flags =====
    @Prop({ type: Boolean, default: true })
    accept_food_orders: boolean;

    @Prop({ type: GeoPointSchema, default: null })
    current_location?: GeoPoint | null;

    @Prop({ type: Date, default: null })
    last_location_update?: Date | null;

    // Stats
    @Prop({ type: Number, default: 0 })
    total_deliveries: number;

    @Prop({ type: Number, default: 0 })
    total_earnings: number;

    @Prop({ type: Number, default: 0 })
    average_rating: number;

    @Prop({ default: 0.1 })
    commission_rate: number;
    // Payout
    @Prop({ type: String, default: null })
    bank_name?: string | null;

    @Prop({ type: String, default: null })
    bank_account_number?: string | null;

    @Prop({ type: String, default: null })
    bank_account_name?: string | null;

    created_at: Date;
    updated_at: Date;
}

export const DriverProfileSchema = SchemaFactory.createForClass(DriverProfile);

DriverProfileSchema.index({ user_id: 1 }, { unique: true });
DriverProfileSchema.index({ current_location: '2dsphere' });
DriverProfileSchema.index({ verification_status: 1, submitted_at: -1 });
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SystemConfigDocument = SystemConfig & Document;

export enum SystemConfigKey {
    COMMISSION_RULES_V1 = 'commission_rules_v1',
}

@Schema({
    collection: 'system_configs',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class SystemConfig {
    _id: Types.ObjectId;

    @Prop({ type: String, enum: SystemConfigKey, required: true, unique: true, index: true })
    key: SystemConfigKey;

    // ✅ default commission cho merchant (platform lấy % trên subtotal)
    @Prop({ type: Number, required: true, min: 0, max: 1, default: 0.2 })
    merchant_commission_rate: number;

    // ✅ default commission cho driver (platform lấy % trên delivery_fee)
    @Prop({ type: Number, required: true, min: 0, max: 1, default: 0.1 })
    driver_commission_rate: number;

    // ✅ platform fee cố định (thu customer) - global
    @Prop({ type: Number, default: 0, min: 0 })
    platform_fee_fixed: number;

    @Prop({ type: Types.ObjectId, ref: 'User', default: null })
    updated_by: Types.ObjectId | null;

    created_at: Date;
    updated_at: Date;
}

export const SystemConfigSchema = SchemaFactory.createForClass(SystemConfig);
SystemConfigSchema.index({ key: 1 }, { unique: true });
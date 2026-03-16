import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserVoucherDocument = UserVoucher & Document;

@Schema({
    collection: 'user_vouchers',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class UserVoucher {
    _id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
    user_id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Voucher', required: true, index: true })
    voucher_id: Types.ObjectId;

    // denormalize để render FE/wallet nhanh hơn
    @Prop({ type: Types.ObjectId, ref: 'Promotion', default: null, index: true })
    promotion_id: Types.ObjectId | null;

    @Prop({ type: Types.ObjectId, ref: 'Merchant', default: null, index: true })
    merchant_id: Types.ObjectId | null;

    @Prop({ type: String, default: null })
    voucher_code: string | null;

    @Prop({ type: String, default: null })
    promotion_name: string | null;

    @Prop({ type: String, default: null })
    sponsor: string | null;

    @Prop({ type: String, default: null })
    scope: string | null;

    @Prop({ type: String, default: null })
    apply_level: string | null;

    @Prop({ type: Date, default: () => new Date() })
    saved_at: Date;

    @Prop({ type: Boolean, default: false })
    is_saved: boolean;

    @Prop({ type: Types.ObjectId, ref: 'Order', default: null })
    used_order_id: Types.ObjectId | null;

    // giữ để tương thích code cũ
    @Prop({ type: Boolean, default: false })
    is_used: boolean;

    // NEW: quan trọng để support per_user_limit > 1
    @Prop({ type: Number, default: 0 })
    used_count: number;

    @Prop({ type: Date, default: null })
    first_used_at: Date | null;

    @Prop({ type: Date, default: null })
    used_at: Date | null;

    @Prop({ type: Date, default: null })
    last_used_at: Date | null;

    @Prop({ type: Date, default: null, index: true })
    deleted_at: Date | null;

    created_at: Date;
    updated_at: Date;
}

export const UserVoucherSchema = SchemaFactory.createForClass(UserVoucher);

UserVoucherSchema.index({ user_id: 1, voucher_id: 1 }, { unique: true });
UserVoucherSchema.index({
    user_id: 1,
    is_saved: 1,
    is_used: 1,
    deleted_at: 1,
    saved_at: -1,
});
UserVoucherSchema.index({ user_id: 1, promotion_id: 1, deleted_at: 1 });
UserVoucherSchema.index({ merchant_id: 1, user_id: 1, deleted_at: 1 });
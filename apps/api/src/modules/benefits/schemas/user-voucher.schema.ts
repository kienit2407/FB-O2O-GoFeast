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

    // bạn chưa có bảng voucher thì cứ lưu ObjectId trước, sau tạo Voucher schema sẽ ref đúng
    @Prop({ type: Types.ObjectId, ref: 'Voucher', required: true, index: true })
    voucher_id: Types.ObjectId;

    @Prop({ type: Date, default: () => new Date() })
    saved_at: Date;

    @Prop({ type: Boolean, default: false })
    is_saved: boolean;

    @Prop({ type: Types.ObjectId, ref: 'Order', default: null })
    used_order_id: Types.ObjectId | null;

    @Prop({ type: Boolean, default: false })
    is_used: boolean;

    @Prop({ type: Date, default: null })
    used_at: Date | null;

    @Prop({ type: Date, default: null, index: true })
    deleted_at: Date | null;

    created_at: Date;
    updated_at: Date;
}

export const UserVoucherSchema = SchemaFactory.createForClass(UserVoucher);

// mỗi user chỉ được lưu 1 lần / 1 voucher
UserVoucherSchema.index({ user_id: 1, voucher_id: 1 }, { unique: true });
UserVoucherSchema.index({ user_id: 1, is_saved: 1, is_used: 1, deleted_at: 1, saved_at: -1 });
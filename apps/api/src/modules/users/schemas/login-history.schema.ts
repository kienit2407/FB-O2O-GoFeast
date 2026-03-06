import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LoginHistoryDocument = LoginHistory & Document;

export enum LoginPlatform {
    WEB = 'web',
    MOBILE = 'mobile',
    UNKNOWN = 'unknown',
}

export enum LoginAuthMethod {
    PASSWORD = 'password',
    OAUTH = 'oauth',
    OTP = 'otp',
}

@Schema({
    collection: 'login_histories',
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class LoginHistory {
    _id: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
    user_id: Types.ObjectId;

    @Prop({ type: String, required: true, index: true }) // admin|merchant|customer|driver
    role: string;

    @Prop({ type: String, required: true, index: true }) // admin_web|merchant_web|customer_mobile|driver_mobile
    app: string;

    @Prop({
        type: String,
        enum: Object.values(LoginPlatform),
        default: LoginPlatform.UNKNOWN,
        index: true,
    })
    platform: LoginPlatform;

    @Prop({
        type: String,
        enum: Object.values(LoginAuthMethod),
        default: LoginAuthMethod.PASSWORD,
    })
    auth_method: LoginAuthMethod;

    @Prop({ type: String, default: null }) // google|github|null
    oauth_provider?: string | null;

    @Prop({ type: String, default: null }) // header x-device-id (nếu có)
    device_id?: string | null;

    @Prop({ type: String, default: null })
    ip?: string | null;

    @Prop({ type: String, default: null })
    user_agent?: string | null;

    @Prop({ type: Object, default: null })
    extra?: Record<string, any> | null;
}

export const LoginHistorySchema = SchemaFactory.createForClass(LoginHistory);

// index hay dùng: xem lịch sử theo user mới nhất
LoginHistorySchema.index({ user_id: 1, created_at: -1 });
LoginHistorySchema.index({ role: 1, created_at: -1 });
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDeviceDocument = UserDevice & Document;

@Schema({
  collection: 'user_devices',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class UserDevice {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user_id: Types.ObjectId;

  @Prop({ type: String, required: true })
  device_id: string;

  @Prop({ type: String, required: true })
  platform: string;

  @Prop({ type: String, required: false })
  fcm_token?: string;

  @Prop({ type: Boolean, default: true })
  is_active: boolean;

  @Prop({ type: Date, default: null })
  last_seen_at: Date | null;

  created_at: Date;
  updated_at: Date;
}

export const UserDeviceSchema = SchemaFactory.createForClass(UserDevice);

// Index chỉ khai ở đây
UserDeviceSchema.index({ user_id: 1, device_id: 1 }, { unique: true });
UserDeviceSchema.index({ fcm_token: 1 }, { unique: true, sparse: true });
UserDeviceSchema.index({ user_id: 1, is_active: 1 });

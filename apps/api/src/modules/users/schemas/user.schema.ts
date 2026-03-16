import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  CUSTOMER = 'customer',
  DRIVER = 'driver',
  MERCHANT = 'merchant',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Schema({ collection: 'users', timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } })
export class User {
  _id: Types.ObjectId;

  @Prop({ unique: true, sparse: true })
  email: string;

  @Prop({ type: String, trim: true })
  phone?: string;
  //  ADD
  @Prop({ type: String, enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;
  @Prop()
  password_hash: string;
  @Prop({ type: String, default: null })
  avatar_public_id: string | null;

  @Prop({ type: [String], default: [] })
  auth_methods: string[];

  @Prop({
    type: [{
      provider: { type: String },
      provider_id: { type: String },
      email: { type: String }
    }],
    default: []
  })
  oauth_providers: {
    provider: string;
    provider_id: string;
    email: string;
  }[];

  @Prop({ required: true })
  full_name: string;

  @Prop()
  avatar_url: string;

  @Prop()
  date_of_birth: Date;

  @Prop({ type: String, enum: ['male', 'female', 'other'] })
  gender: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.CUSTOMER })
  role: UserRole;


  @Prop({ default: 'vi' })
  language: string;

  @Prop({ default: true })
  notification_enabled: boolean;

  @Prop({ type: Date, default: null })
  deleted_at: Date | null;


  created_at: Date;
  updated_at: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);


UserSchema.index({ email: 1 }, { unique: true, sparse: true });
UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ deleted_at: 1 });

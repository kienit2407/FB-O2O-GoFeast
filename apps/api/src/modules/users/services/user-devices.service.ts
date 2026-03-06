import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserDevice, UserDeviceDocument } from '../schemas/user-device.schema';

@Injectable()
export class UserDevicesService {
    constructor(
        @InjectModel(UserDevice.name)
        private readonly model: Model<UserDeviceDocument>,
    ) { }

    async upsertDevice(input: { userId: string; deviceId: string; platform: string; fcmToken?: string | null }) {
        const now = new Date();
        const filter = { user_id: new Types.ObjectId(input.userId), device_id: input.deviceId };

        const update: any = {
            $setOnInsert: {
                user_id: new Types.ObjectId(input.userId),
                device_id: input.deviceId,
            },
            $set: {
                platform: input.platform,
                is_active: true,
                last_seen_at: now,
            },
        };

        const token = (input.fcmToken ?? '').trim();
        if (token.length > 0) update.$set.fcm_token = token;
        else update.$unset = { fcm_token: 1 };

        return this.model.findOneAndUpdate(filter, update, {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
        });
    }
}
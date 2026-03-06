import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
    LoginAuthMethod,
    LoginHistory,
    LoginHistoryDocument,
    LoginPlatform,
} from '../schemas/login-history.schema';

@Injectable()
export class LoginHistoryService {
    constructor(
        @InjectModel(LoginHistory.name)
        private readonly model: Model<LoginHistoryDocument>,
    ) { }

    async record(input: {
        userId: string;
        role: string;
        app: string;
        platform: LoginPlatform;
        authMethod: LoginAuthMethod;
        oauthProvider?: string | null;
        deviceId?: string | null;
        ip?: string | null;
        userAgent?: string | null;
        extra?: Record<string, any> | null;
    }) {
        return this.model.create({
            user_id: new Types.ObjectId(input.userId),
            role: input.role,
            app: input.app,
            platform: input.platform,
            auth_method: input.authMethod,
            oauth_provider: input.oauthProvider ?? null,
            device_id: input.deviceId ?? null,
            ip: input.ip ?? null,
            user_agent: input.userAgent ?? null,
            extra: input.extra ?? null,
        });
    }
}
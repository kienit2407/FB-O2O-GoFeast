// src/auth/services/refresh-session-service.ts
import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import * as crypto from 'crypto';
import { ConfigService } from '../../../config/config.service';

type RtSession = {
    userId: string;
    deviceId: string | null;
    aud: string;
    role: string;
    createdAt: string;
};

@Injectable()
export class RefreshSessionService {
    private redis: Redis;
    private ttlSeconds = 30 * 24 * 60 * 60;

    constructor(private config: ConfigService) {
        this.redis = new Redis({
            host: this.config.redisHost || 'localhost',
            port: this.config.redisPort || 6379,
            password: this.config.redisPassword,
        });
    }

    async createSession(input: { userId: string; deviceId?: string; aud: string; role: string }) {
        const sid = crypto.randomUUID();
        const key = `rt:${sid}`;

        const value: RtSession = {
            userId: input.userId,
            deviceId: input.deviceId ?? null,
            aud: input.aud,
            role: input.role,
            createdAt: new Date().toISOString(),
        };

        await this.redis.set(key, JSON.stringify(value), 'EX', this.ttlSeconds);

        await this.redis.sadd(`user_rt:${input.userId}`, sid);
        await this.redis.expire(`user_rt:${input.userId}`, this.ttlSeconds);

        return sid;
    }

    async getSession(sid: string): Promise<RtSession | null> {
        const v = await this.redis.get(`rt:${sid}`);
        return v ? (JSON.parse(v) as RtSession) : null;
    }

    async exists(sid: string) {
        return !!(await this.redis.get(`rt:${sid}`));
    }

    async revokeSession(sid: string) {
        const session = await this.getSession(sid);
        await this.redis.del(`rt:${sid}`);
        if (session?.userId) {
            await this.redis.srem(`user_rt:${session.userId}`, sid);
        }
    }

    async rotateSession(
        oldSid: string,
        input: { userId: string; deviceId?: string; aud: string; role: string },
    ) {
        await this.revokeSession(oldSid);
        return this.createSession(input);
    }
}
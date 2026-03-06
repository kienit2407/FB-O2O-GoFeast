import { BadRequestException, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { encodeState } from '../common/oauth_state';
import { OAUTH_CTX_COOKIE } from '../common/auth.constants';

@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
    private isCallback(req: Request) {
        return req.path.endsWith('/google/callback');
    }

    async canActivate(context: ExecutionContext) {
        const req = context.switchToHttp().getRequest<Request>();
        const res = context.switchToHttp().getResponse<Response>();

        if (!this.isCallback(req)) {
            const actor = req.query.actor as 'customer' | 'driver' | undefined;
            const app = req.query.app as string | undefined;
            const from = req.query.from as string | undefined;

            const deviceId =
                (req.query.deviceId as string | undefined) ??
                ((req.headers['x-device-id'] as string | undefined) ?? null);

            if (!actor || !app) throw new BadRequestException('Missing actor/app');

            const raw = encodeState({ actor, app, from, deviceId });

            res.cookie(OAUTH_CTX_COOKIE, raw, {
                httpOnly: true,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 5 * 60 * 1000,
                path: '/auth/oauth', // ✅ cho chắc callback luôn đọc được
            });
        }

        return (await super.canActivate(context)) as boolean;
    }

    getAuthenticateOptions(context: ExecutionContext) {
        const req = context.switchToHttp().getRequest<Request>();

        if (this.isCallback(req)) return { session: false };

        const actor = req.query.actor as 'customer' | 'driver' | undefined;
        const app = req.query.app as string | undefined;
        const from = req.query.from as string | undefined;

        const deviceId =
            (req.query.deviceId as string | undefined) ??
            ((req.headers['x-device-id'] as string | undefined) ?? null);

        if (!actor || !app) throw new BadRequestException('Missing actor/app');

        return {
            session: false,
            state: encodeState({ actor, app, from, deviceId }), // ✅ quan trọng
        };
    }
}
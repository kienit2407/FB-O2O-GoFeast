import { Controller, Get, Req, Res, UseGuards, BadRequestException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { GoogleOAuthGuard } from '../guards/google-oauth.guard';
import { GithubOAuthGuard } from '../guards/github-oauth.guard';
import { decodeState } from '../common/oauth_state';
import { OAUTH_CTX_COOKIE } from '../common/auth.constants';
import { getClientInfo } from 'src/common/utils/request-client-info';
import { LoginHistoryService } from 'src/modules/users/services/login-history.service';
import { LoginAuthMethod } from 'src/modules/users/schemas/login-history.schema';

@Controller('auth/oauth')
export class OAuthController {
    constructor(private readonly authService: AuthService, private readonly loginHistoryService: LoginHistoryService,) { }

    @Get('google')
    @UseGuards(GoogleOAuthGuard)
    async googleStart() { }

    @Get('google/callback')
    @UseGuards(GoogleOAuthGuard)
    async googleCallback(@Req() req: Request, @Res() res: Response) {
        const raw =
            (req.query.state as string | undefined) ??
            (req.cookies?.[OAUTH_CTX_COOKIE] as string | undefined);

        const state = decodeState(raw);

        // ✅ check null trước khi dùng state.*
        if (!state) {
            // (tuỳ bạn) vẫn clear cookie cho sạch
            res.clearCookie(OAUTH_CTX_COOKIE, {
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                path: '/auth/oauth',
            });
            throw new BadRequestException('Invalid state');
        }

        // clear cookie sau khi state hợp lệ (hoặc giữ như trên cũng ok)
        res.clearCookie(OAUTH_CTX_COOKIE, {
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/auth/oauth',
        });

        const app = state.app as any; // customer_mobile | driver_mobil
        null;
        const deviceId = state.deviceId ?? null;
        // ✅ login trước -> có result
        let result: { userId: string; accessToken: string; refreshToken: string };

        if (state.actor === 'customer') {
            result = await this.authService.loginCustomerOAuth(req.user as any, {
                app,
                deviceId,
            });
        } else if (state.actor === 'driver') {
            result = await this.authService.loginDriverOAuth(req.user as any, {
                app,
                deviceId,
            });
        } else {
            throw new BadRequestException('Invalid actor');
        }

        // ✅ record sau khi đã có result.userId
        const info = getClientInfo(req, app);
        await this.loginHistoryService.record({
            userId: result.userId,
            role: state.actor,          // 'customer' | 'driver'
            app,
            platform: info.platform,    // mobile theo app
            authMethod: LoginAuthMethod.OAUTH,
            oauthProvider: (req.user as any)?.provider ?? 'google',
            deviceId,
            ip: info.ip,
            userAgent: info.userAgent,
        });

        const redirectUri =
            `myshop://oauth-callback` +
            `?actor=${encodeURIComponent(state.actor)}` +
            `&accessToken=${encodeURIComponent(result.accessToken)}` +
            `&refreshToken=${encodeURIComponent(result.refreshToken)}`;

        return res.redirect(redirectUri);
    }

    @Get('github')
    @UseGuards(GithubOAuthGuard)
    async githubStart() { }

    @Get('github/callback')
    @UseGuards(GithubOAuthGuard)
    async githubCallback(@Req() req: Request, @Res() res: Response) {
        const raw =
            (req.query.state as string | undefined) ??
            (req.cookies?.[OAUTH_CTX_COOKIE] as string | undefined);

        const state = decodeState(raw);

        // ✅ check null trước khi dùng state.*
        if (!state) {
            // (tuỳ bạn) vẫn clear cookie cho sạch
            res.clearCookie(OAUTH_CTX_COOKIE, {
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
            });
            throw new BadRequestException('Invalid state');
        }

        // clear cookie sau khi state hợp lệ (hoặc giữ như trên cũng ok)
        res.clearCookie(OAUTH_CTX_COOKIE, {
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
        });

        const app = state.app as any; // customer_mobile | driver_mobile
        const deviceId = state.deviceId ?? null;

        // ✅ login trước -> có result
        let result: { userId: string; accessToken: string; refreshToken: string };

        if (state.actor === 'customer') {
            result = await this.authService.loginCustomerOAuth(req.user as any, {
                app,
                deviceId,
            });
        } else if (state.actor === 'driver') {
            result = await this.authService.loginDriverOAuth(req.user as any, {
                app,
                deviceId,
            });
        } else {
            throw new BadRequestException('Invalid actor');
        }

        // ✅ record sau khi đã có result.userId
        const info = getClientInfo(req, app);
        await this.loginHistoryService.record({
            userId: result.userId,
            role: state.actor,          // 'customer' | 'driver'
            app,
            platform: info.platform,    // mobile theo app
            authMethod: LoginAuthMethod.OAUTH,
            oauthProvider: (req.user as any)?.provider ?? 'github',
            deviceId: deviceId,
            ip: info.ip,
            userAgent: info.userAgent,
        });

        const redirectUri =
            `myshop://oauth-callback` +
            `?actor=${encodeURIComponent(state.actor)}` +
            `&accessToken=${encodeURIComponent(result.accessToken)}` +
            `&refreshToken=${encodeURIComponent(result.refreshToken)}`;

        return res.redirect(redirectUri);
    }
}
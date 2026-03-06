import type { Request } from 'express';
import { LoginPlatform } from 'src/modules/users/schemas/login-history.schema';

function pickFirstIp(xff: string | string[] | undefined): string | null {
    if (!xff) return null;
    const raw = Array.isArray(xff) ? xff[0] : xff;
    const first = raw.split(',')[0]?.trim();
    return first || null;
}

export function getClientInfo(req: Request, app?: string) {
    const userAgent = (req.headers['user-agent'] as string | undefined) ?? null;
    const deviceId = (req.headers['x-device-id'] as string | undefined) ?? null;

    const ip =
        pickFirstIp(req.headers['x-forwarded-for'] as any) ??
        (req.ip as string | undefined) ??
        ((req.connection as any)?.remoteAddress as string | undefined) ??
        null;

    // Ưu tiên theo app vì bạn đã phân rõ *_mobile / *_web
    let platform: LoginPlatform = LoginPlatform.UNKNOWN;
    if (app?.includes('_mobile')) platform = LoginPlatform.MOBILE;
    else if (app?.includes('_web')) platform = LoginPlatform.WEB;
    else if (userAgent && /android|iphone|ipad|ipod|mobile/i.test(userAgent)) platform = LoginPlatform.MOBILE;
    else if (userAgent) platform = LoginPlatform.WEB;

    return { platform, ip, userAgent, deviceId };
}
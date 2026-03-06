// src/auth/strategies/jwt-refresh.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { ConfigService } from '../../../config/config.service';
import { UsersService } from 'src/modules/users/services/users.service';
import { RefreshSessionService } from '../services/refresh-session-service';
import { ClientApp, REFRESH_COOKIE_NAME } from '../common/auth.constants';

function getClientApp(req: Request): ClientApp {
  const app = (req.headers['x-client-app'] as string) || 'merchant_web';
  return app as ClientApp;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private refreshSessionService: RefreshSessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          const app = getClientApp(req);
          const cookieName = REFRESH_COOKIE_NAME[app];
          return req?.cookies?.[cookieName];
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.jwtRefreshSecret,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: any) {
    if (payload?.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token type');
    }

    const userId = payload.sub;
    const sid = payload.sid as string | undefined;
    if (!userId || !sid) throw new UnauthorizedException('Missing sub/sid');

    // ✅ CHECK REDIS SESSION
    const session = await this.refreshSessionService.getSession(sid);
    if (!session) throw new UnauthorizedException('Refresh session revoked');

    // ✅ MATCH session data
    if (session.userId !== userId) throw new UnauthorizedException('Session user mismatch');
    if (session.aud !== payload.aud) throw new UnauthorizedException('Session aud mismatch');
    if (session.role !== payload.role) throw new UnauthorizedException('Session role mismatch');

    // (optional) bind by deviceId header
    const deviceId = (req.headers['x-device-id'] as string | undefined) ?? undefined;
    if (session.deviceId && deviceId && session.deviceId !== deviceId) {
      throw new UnauthorizedException('Session device mismatch');
    }

    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    return {
      sub: userId,
      userId,
      email: payload.email,
      role: payload.role,
      aud: payload.aud,
      sid,
      type: payload.type,
    };
  }
}
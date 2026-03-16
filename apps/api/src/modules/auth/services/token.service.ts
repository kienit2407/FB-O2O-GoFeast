import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, ClientApp } from '../common/auth.constants';
import { ConfigService } from '../../../config/config.service';

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
  aud: ClientApp;
  sid?: string;
}

export interface AccessTokenResult {
  access_token: string;
  expires_in: number;
}

export interface RefreshTokenResult {
  refresh_token: string;
  expires_in: number;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  async signAccessToken(params: {
    userId: string;
    email: string;
    role: Role;
    aud: ClientApp;
    sid?: string;
  }): Promise<AccessTokenResult> {
    const { userId, email, role, aud, sid } = params;

    const payload = {
      sub: userId,
      email,
      role,
      aud,
      sid,
      type: 'access',
    };

    const expiresIn = '15m'; // 15 minutes
    const access_token = await this.jwtService.signAsync(payload, { expiresIn });

    return { access_token, expires_in: this.parseExpiresIn(expiresIn) };
  }
  async verifyAccessToken(token: string) {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: this.configService.jwtSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }
  async signRefreshToken(params: {
    userId: string;
    email: string;
    role: Role;
    aud: ClientApp;
    sid?: string;
  }): Promise<RefreshTokenResult> {
    const { userId, email, role, aud, sid } = params;

    const payload = {
      sub: userId,
      email,
      role,
      aud,
      sid,
      type: 'refresh',
    };

    const expiresIn = '30d'; // 30 days
    // Sign with jwtRefreshSecret instead of jwtSecret
    const refresh_token = await this.jwtService.signAsync(payload, {
      expiresIn,
      secret: this.configService.jwtRefreshSecret,
    });

    return { refresh_token, expires_in: this.parseExpiresIn(expiresIn) };
  }

  async verifyRefreshToken(token: string) {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: this.configService.jwtRefreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
  private parseExpiresIn(expiresIn: string): number {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1), 10);

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 60 * 60 * 24;
      default:
        return 3600; // default 1 hour
    }
  }
}

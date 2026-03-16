import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from 'src/config/config.service';
import { DineInTokenPayload } from '../interfaces/dinein-token-payload.interface';

@Injectable()
export class DineInSessionTokenService {
    constructor(
        private readonly jwtService: JwtService,
        private readonly config: ConfigService,
    ) { }

    private get secret() {
        return (
            this.config.get<string>('DINEIN_TOKEN_SECRET') ||
            'change-me-dinein-secret'
        );
    }

    private get expiresIn() {
        return this.config.get<string>('DINEIN_TOKEN_EXPIRES_IN') || '12h';
    }

    async sign(payload: DineInTokenPayload): Promise<string> {
        return this.jwtService.signAsync(
            payload as any, // 👉 1. Ép kiểu payload thành any (hoặc Record<string, any>)
            {
                secret: this.secret,
                expiresIn: this.expiresIn,
            } as JwtSignOptions // 👉 2. Ép kiểu chính xác cho options
        );
    }

    async verify(token: string): Promise<DineInTokenPayload> {
        try {
            const payload = await this.jwtService.verifyAsync<DineInTokenPayload>(
                token,
                {
                    secret: this.secret,
                },
            );

            if (!payload || payload.type !== 'dine_in') {
                throw new UnauthorizedException('Invalid dine-in token');
            }

            return payload;
        } catch {
            throw new UnauthorizedException('Invalid or expired dine-in token');
        }
    }
}
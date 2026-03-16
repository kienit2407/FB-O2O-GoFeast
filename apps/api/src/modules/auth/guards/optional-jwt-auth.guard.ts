import {
    CanActivate,
    ExecutionContext,
    Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from 'src/config/config.service';

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly config: ConfigService,
    ) { }

    private get secret() {
        return (
            this.config.get<string>('JWT_SECRET') ||
            'your-super-secret-jwt-key-change-in-production'
        );
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();

        const authHeader = String(req.headers?.authorization ?? '').trim();
        if (!authHeader.toLowerCase().startsWith('bearer ')) {
            req.user = null;
            return true;
        }

        const token = authHeader.slice(7).trim();
        if (!token) {
            req.user = null;
            return true;
        }

        try {
            const payload = await this.jwtService.verifyAsync(token, {
                secret: this.secret,
            });
            req.user = payload ?? null;
        } catch {
            req.user = null;
        }

        return true;
    }
}
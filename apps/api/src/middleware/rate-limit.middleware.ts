import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface ThrottleEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private throttleStore = new Map<string, ThrottleEntry>();
  
  // Different limits for different endpoints
  private readonly configs: Record<string, RateLimitConfig> = {
    'default': { limit: 100, windowMs: 60000 },           // 100 requests/minute
    'auth': { limit: 30, windowMs: 60000 },              // 30 requests/minute for auth endpoints (increased from 10)
    'strict': { limit: 10, windowMs: 60000 },             // 10 requests/minute for sensitive ops
  };

  use(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const method = req.method;
    const path = req.path;
    
    // Determine which config to use based on path
    let config = this.configs['default'];
    if (path.includes('/auth/')) {
      config = this.configs['auth'];
    } else if (path.includes('/otp') || path.includes('/password/reset')) {
      config = this.configs['strict'];
    }
    
    const key = `ratelimit:${ip}:${method}:${path}`;
    const { limit, windowMs } = config;

    const now = Date.now();
    let entry = this.throttleStore.get(key);

    if (!entry || entry.resetTime < now) {
      entry = {
        count: 1,
        resetTime: now + windowMs,
      };
      this.throttleStore.set(key, entry);
    } else {
      entry.count++;
    }

    const remaining = Math.max(0, limit - entry.count);
    const resetIn = Math.ceil((entry.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetIn);

    if (entry.count > limit) {
      res.setHeader('Retry-After', resetIn);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests, please try again later',
          retryAfter: resetIn,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    next();
  }
}

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '../../../config/config.service';

function safeFullName(given?: string, family?: string, display?: string, email?: string) {
  const parts = [given, family].filter((x) => !!x && x.trim().length > 0);
  const joined = parts.join(' ').trim();
  if (joined) return joined;
  if (display && display.trim()) return display.trim();
  if (email) return email.split('@')[0];
  return 'User';
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.googleClientId,
      clientSecret: configService.googleClientSecret,
      callbackURL: configService.googleCallbackUrl,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos, displayName } = profile;

    const email = emails?.[0]?.value ?? null;
    const full_name = safeFullName(name?.givenName, name?.familyName, displayName, email ?? undefined);

    const user = {
      provider: 'google',
      provider_id: String(id),
      email,
      full_name,
      avatar_url: photos?.[0]?.value ?? null,
      access_token: accessToken,
    };

    done(null, user);
  }
}
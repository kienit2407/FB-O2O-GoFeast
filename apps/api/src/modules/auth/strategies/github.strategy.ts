import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '../../../config/config.service';

function safeName(displayName?: string, username?: string, email?: string) {
  const n = (displayName ?? '').trim() || (username ?? '').trim();
  if (n) return n;
  if (email) return email.split('@')[0];
  return 'User';
}

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.githubClientId,
      clientSecret: configService.githubClientSecret,
      callbackURL: configService.githubCallbackUrl,
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any,
  ): Promise<any> {
    const { id, username, emails, displayName, photos } = profile;

    const email = emails?.[0]?.value || (username ? `${username}@github.com` : null);
    const full_name = safeName(displayName, username, email ?? undefined);

    const user = {
      provider: 'github',
      provider_id: String(id),
      email,
      full_name,
      avatar_url: photos?.[0]?.value ?? null,
      access_token: accessToken,
    };

    done(null, user);
  }
}

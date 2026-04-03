import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { AuthService } from './auth.service';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID', ''),
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET', ''),
      callbackURL: configService.get<string>(
        'GITHUB_CALLBACK_URL',
        'http://localhost:3001/api/v1/auth/github/callback',
      ),
      scope: ['user:email'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (err?: Error | null, user?: unknown) => void,
  ): Promise<void> {
    const githubId = String(profile.id);
    const primary =
      profile.emails?.find((e) => (e as { primary?: boolean }).primary)
        ?.value ?? profile.emails?.[0]?.value;
    const email =
      primary ??
      (profile.username
        ? `${githubId}+${profile.username}@users.noreply.github.com`
        : null);
    if (!email) {
      done(new Error('GitHub profile has no usable email'), false);
      return;
    }
    const name =
      profile.displayName?.trim() ||
      profile.username ||
      email.split('@')[0] ||
      'User';
    const avatarUrl = profile.photos?.[0]?.value?.trim() || undefined;

    const user = await this.authService.loginOrRegisterGithub({
      githubId,
      email,
      name,
      avatarUrl,
    });
    done(null, user);
  }
}

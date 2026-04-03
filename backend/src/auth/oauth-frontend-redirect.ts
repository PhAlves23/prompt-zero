import { ConfigService } from '@nestjs/config';

export type OAuthSessionTokens = {
  accessToken: string;
  refreshToken: string;
};

/**
 * Redirect browser to Next.js after OAuth; fragment is not sent to the server on navigation.
 * Locale segment defaults to BILLING_UI_LOCALE (same convention as Stripe return URLs).
 */
export function buildOAuthFrontendCallbackRedirect(
  config: ConfigService,
  tokens: OAuthSessionTokens,
): string {
  const frontend = config
    .get<string>('FRONTEND_URL', 'http://localhost:3000')
    .replace(/\/+$/, '');
  const locale = config.get<string>('BILLING_UI_LOCALE', 'en-US');
  const fragment = new URLSearchParams({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  }).toString();
  return `${frontend}/${locale}/auth/oauth-callback#${fragment}`;
}

import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import {
  buildOAuthFrontendCallbackRedirect,
  type OAuthSessionTokens,
} from './oauth-frontend-redirect';

@ApiTags('auth')
@Controller('auth')
export class GoogleAuthController {
  constructor(private readonly configService: ConfigService) {}

  @Get('google')
  @Public()
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Start Google OAuth (requires GOOGLE_* env)' })
  googleAuth() {
    return;
  }

  @Get('google/callback')
  @Public()
  @UseGuards(AuthGuard('google'))
  @ApiOperation({
    summary:
      'Google OAuth callback — redirects to FRONTEND_URL with tokens in URL fragment',
  })
  googleCallback(
    @Req() req: Request & { user?: OAuthSessionTokens },
    @Res() res: Response,
  ) {
    const tokens = req.user;
    if (!tokens?.accessToken || !tokens?.refreshToken) {
      return res.status(500).json({ message: 'OAuth session incomplete' });
    }
    const url = buildOAuthFrontendCallbackRedirect(this.configService, tokens);
    return res.redirect(302, url);
  }
}

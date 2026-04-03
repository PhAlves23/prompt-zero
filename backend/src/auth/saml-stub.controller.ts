import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';

/**
 * Enterprise SAML entrypoints — full passport-saml flow is not wired yet.
 * Keeps API surface documented for Team/Enterprise integrations.
 */
@ApiTags('enterprise-sso')
@Controller({ path: 'enterprise/saml', version: '1' })
export class SamlStubController {
  @Public()
  @Get('status')
  @ApiOperation({
    summary: 'SAML availability (stub until passport-saml is configured)',
  })
  status() {
    return {
      enabled: false,
      message: 'SAML SSO is not enabled in this deployment.',
    };
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Init SAML login (not implemented)' })
  loginStub() {
    throw new HttpException(
      {
        code: 'saml_not_implemented',
        message:
          'SAML SSO is not implemented yet. Use Google OAuth or email/password.',
      },
      HttpStatus.NOT_IMPLEMENTED,
    );
  }

  @Public()
  @Post('acs')
  @ApiOperation({ summary: 'SAML ACS (not implemented)' })
  acsStub() {
    throw new HttpException(
      {
        code: 'saml_not_implemented',
        message: 'SAML Assertion Consumer Service is not implemented.',
      },
      HttpStatus.NOT_IMPLEMENTED,
    );
  }
}

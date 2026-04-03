import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { PlatformApiKeysService } from './platform-api-keys.service';

@ApiTags('platform-api-keys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'platform-api-keys', version: '1' })
export class PlatformApiKeysController {
  constructor(private readonly keysService: PlatformApiKeysService) {}

  @Post()
  @ApiOperation({ summary: 'Create API key (plaintext shown once)' })
  create(@CurrentUser() user: AuthUser) {
    return this.keysService.create(user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'List API keys (metadata only)' })
  list(@CurrentUser() user: AuthUser) {
    return this.keysService.list(user.sub);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke API key' })
  revoke(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.keysService.revoke(user.sub, id);
  }
}

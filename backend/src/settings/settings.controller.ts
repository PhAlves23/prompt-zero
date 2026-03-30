import { Body, Controller, Get, Patch, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateApiKeysDto } from './dto/update-api-keys.dto';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Patch('profile')
  @ApiOperation({ summary: 'Atualizar perfil do usuário' })
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.settingsService.updateProfile(user.sub, dto);
  }

  @Put('api-keys')
  @ApiOperation({ summary: 'Salvar/atualizar API keys do usuário' })
  updateApiKeys(@CurrentUser() user: AuthUser, @Body() dto: UpdateApiKeysDto) {
    return this.settingsService.updateApiKeys(user.sub, dto);
  }

  @Get('api-keys')
  @ApiOperation({
    summary:
      'Verificar status de API keys cadastradas (sem expor valor completo)',
  })
  getApiKeys(@CurrentUser() user: AuthUser) {
    return this.settingsService.getApiKeysStatus(user.sub);
  }
}

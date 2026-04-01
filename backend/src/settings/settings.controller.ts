import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  ParseFilePipeBuilder,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiConsumes,
} from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/interfaces/auth-user.interface';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateApiKeysDto } from './dto/update-api-keys.dto';
import { UpsertProviderCredentialDto } from './dto/upsert-provider-credential.dto';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Patch('profile')
  @ApiOperation({ summary: 'Update user profile' })
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.settingsService.updateProfile(user.sub, dto);
  }

  @Put('api-keys')
  @ApiOperation({ summary: 'Save or update user API keys' })
  updateApiKeys(@CurrentUser() user: AuthUser, @Body() dto: UpdateApiKeysDto) {
    return this.settingsService.updateApiKeys(user.sub, dto);
  }

  @Get('api-keys')
  @ApiOperation({
    summary: 'Get API key configuration status (without exposing key values)',
  })
  getApiKeys(@CurrentUser() user: AuthUser) {
    return this.settingsService.getApiKeysStatus(user.sub);
  }

  @Get('provider-credentials')
  @ApiOperation({ summary: 'List user provider credentials' })
  listProviderCredentials(@CurrentUser() user: AuthUser) {
    return this.settingsService.listProviderCredentials(user.sub);
  }

  @Post('provider-credentials')
  @ApiOperation({ summary: 'Create provider credential' })
  createProviderCredential(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertProviderCredentialDto,
  ) {
    return this.settingsService.upsertProviderCredential(user.sub, dto);
  }

  @Patch('provider-credentials/:id')
  @ApiOperation({ summary: 'Update provider credential' })
  updateProviderCredential(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpsertProviderCredentialDto,
  ) {
    return this.settingsService.upsertProviderCredential(user.sub, dto, id);
  }

  @Delete('provider-credentials/:id')
  @ApiOperation({ summary: 'Delete provider credential' })
  removeProviderCredential(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ) {
    return this.settingsService.removeProviderCredential(user.sub, id);
  }

  @Post('avatar')
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('avatar'))
  uploadAvatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /(jpg|jpeg|png|webp)$/,
        })
        .addMaxSizeValidator({
          maxSize: 2 * 1024 * 1024,
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('errors.avatarFileRequired');
    }
    return this.settingsService.uploadAvatar(user.sub, file);
  }

  @Delete('avatar')
  @ApiOperation({ summary: 'Remove user avatar' })
  removeAvatar(@CurrentUser() user: AuthUser) {
    return this.settingsService.removeAvatar(user.sub);
  }
}

import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateApiKeysDto } from './dto/update-api-keys.dto';
import { ConfigService } from '@nestjs/config';
import { encryptText } from '../common/utils/crypto.util';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getEnvSecret } from '../common/utils/env.util';

@Injectable()
export class SettingsService {
  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  async updateApiKeys(userId: string, dto: UpdateApiKeysDto) {
    const encryptionSecret = getEnvSecret(
      this.configService,
      'ENCRYPTION_SECRET',
      'dev-encryption-secret',
    );

    await this.usersService.updateApiKeys(userId, {
      openaiApiKeyEnc: dto.openaiApiKey
        ? encryptText(dto.openaiApiKey, encryptionSecret)
        : undefined,
      anthropicApiKeyEnc: dto.anthropicApiKey
        ? encryptText(dto.anthropicApiKey, encryptionSecret)
        : undefined,
    });

    return this.getApiKeysStatus(userId);
  }

  async getApiKeysStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        openaiApiKeyEnc: true,
        anthropicApiKeyEnc: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return {
      openaiConfigured: Boolean(user.openaiApiKeyEnc),
      anthropicConfigured: Boolean(user.anthropicApiKeyEnc),
    };
  }
}

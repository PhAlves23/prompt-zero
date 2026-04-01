import { Injectable, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateApiKeysDto } from './dto/update-api-keys.dto';
import { ConfigService } from '@nestjs/config';
import { encryptText } from '../common/utils/crypto.util';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getEnvSecret } from '../common/utils/env.util';
import { ProviderType } from '@prisma/client';
import { UpsertProviderCredentialDto } from './dto/upsert-provider-credential.dto';
import { MinioService } from '../minio/minio.service';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
  ) {}

  updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  async updateApiKeys(userId: string, dto: UpdateApiKeysDto) {
    const providersToUpsert: Array<{
      provider: ProviderType;
      apiKey?: string;
    }> = [
      { provider: ProviderType.openai, apiKey: dto.openaiApiKey },
      { provider: ProviderType.anthropic, apiKey: dto.anthropicApiKey },
      { provider: ProviderType.google, apiKey: dto.googleApiKey },
      { provider: ProviderType.openrouter, apiKey: dto.openrouterApiKey },
    ];

    for (const item of providersToUpsert) {
      if (item.apiKey) {
        await this.upsertProviderCredential(userId, {
          provider: item.provider,
          apiKey: item.apiKey,
          label: 'default',
          isDefault: true,
          isActive: true,
        });
      }
    }

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
      throw new NotFoundException('errors.userNotFound');
    }

    return {
      openaiConfigured: Boolean(user.openaiApiKeyEnc),
      anthropicConfigured: Boolean(user.anthropicApiKeyEnc),
      providers: await this.listProviderCredentials(userId),
    };
  }

  async listProviderCredentials(userId: string) {
    const credentials = await this.prisma.providerCredential.findMany({
      where: { userId },
      orderBy: [{ provider: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        provider: true,
        label: true,
        baseUrl: true,
        organizationId: true,
        isDefault: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return credentials;
  }

  async upsertProviderCredential(
    userId: string,
    dto: UpsertProviderCredentialDto,
    credentialId?: string,
  ) {
    const encryptionSecret = getEnvSecret(
      this.configService,
      'ENCRYPTION_SECRET',
      'dev-encryption-secret',
    );
    const apiKeyEnc = encryptText(dto.apiKey, encryptionSecret);

    if (dto.isDefault) {
      await this.prisma.providerCredential.updateMany({
        where: { userId, provider: dto.provider, isDefault: true },
        data: { isDefault: false },
      });
    }

    if (credentialId) {
      const existing = await this.prisma.providerCredential.findFirst({
        where: { id: credentialId, userId },
      });
      if (!existing) {
        throw new NotFoundException('errors.providerCredentialNotFound');
      }

      return this.prisma.providerCredential.update({
        where: { id: credentialId },
        data: {
          provider: dto.provider,
          apiKeyEnc,
          label: dto.label,
          baseUrl: dto.baseUrl,
          organizationId: dto.organizationId,
          isDefault: dto.isDefault,
          isActive: dto.isActive,
        },
      });
    }

    return this.prisma.providerCredential.create({
      data: {
        userId,
        provider: dto.provider,
        apiKeyEnc,
        label: dto.label,
        baseUrl: dto.baseUrl,
        organizationId: dto.organizationId,
        isDefault: dto.isDefault ?? false,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async removeProviderCredential(userId: string, credentialId: string) {
    const existing = await this.prisma.providerCredential.findFirst({
      where: { id: credentialId, userId },
    });
    if (!existing) {
      throw new NotFoundException('errors.providerCredentialNotFound');
    }

    await this.prisma.providerCredential.delete({
      where: { id: credentialId },
    });
    return { deleted: true };
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    try {
      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new NotFoundException('errors.userNotFound');
      }

      if (user.avatarUrl) {
        const fileName = this.extractFileNameFromUrl(user.avatarUrl);
        if (fileName) {
          await this.minioService.deleteAvatar(fileName);
        }
      }

      const { fileName, url } = await this.minioService.uploadAvatar(
        file.buffer,
        userId,
        file.originalname,
      );

      this.logger.log(`Avatar uploaded for user ${userId}: ${fileName}`);

      await this.minioService.deleteOldAvatars(userId, fileName);

      return this.usersService.updateAvatar(userId, url);
    } catch (error) {
      this.logger.error(
        `Error uploading avatar for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async removeAvatar(userId: string) {
    try {
      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new NotFoundException('errors.userNotFound');
      }

      if (user.avatarUrl) {
        const fileName = this.extractFileNameFromUrl(user.avatarUrl);
        if (fileName) {
          await this.minioService.deleteAvatar(fileName);
        }
      }

      this.logger.log(`Avatar removed for user ${userId}`);

      return this.usersService.removeAvatar(userId);
    } catch (error) {
      this.logger.error(
        `Error removing avatar for user ${userId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private extractFileNameFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const bucketIndex = pathParts.findIndex(
        (part) => part === this.configService.get('MINIO_BUCKET_NAME'),
      );
      if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
        return pathParts.slice(bucketIndex + 1).join('/');
      }
      return null;
    } catch {
      return null;
    }
  }
}

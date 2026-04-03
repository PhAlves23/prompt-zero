import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

@Injectable()
export class PlatformApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string) {
    const raw = `pz_${randomBytes(32).toString('base64url')}`;
    const keyPrefix = raw.slice(0, 12);
    const keyHash = await bcrypt.hash(raw, 10);
    const row = await this.prisma.platformApiKey.create({
      data: {
        userId,
        keyHash,
        keyPrefix,
        label: 'default',
      },
    });
    return {
      id: row.id,
      apiKey: raw,
      keyPrefix: row.keyPrefix,
      createdAt: row.createdAt,
    };
  }

  list(userId: string) {
    return this.prisma.platformApiKey.findMany({
      where: { userId, revokedAt: null },
      select: {
        id: true,
        label: true,
        keyPrefix: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(userId: string, id: string) {
    const row = await this.prisma.platformApiKey.findFirst({
      where: { id, userId, revokedAt: null },
    });
    if (!row) {
      throw new NotFoundException('errors.apiKeyNotFound');
    }
    await this.prisma.platformApiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    return { revoked: true };
  }
}

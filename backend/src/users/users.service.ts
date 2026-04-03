import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionStatus, SubscriptionTier, User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  createUser(data: {
    name: string;
    email: string;
    passwordHash: string;
    avatarUrl?: string | null;
  }) {
    const { avatarUrl, ...rest } = data;
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          ...rest,
          ...(avatarUrl != null && avatarUrl !== '' ? { avatarUrl } : {}),
        },
      });

      await tx.workspace.create({
        data: {
          name: 'Default',
          description: 'User default workspace',
          color: '#6366F1',
          isDefault: true,
          userId: user.id,
        },
      });

      await tx.subscription.create({
        data: {
          userId: user.id,
          tier: SubscriptionTier.free,
          status: SubscriptionStatus.active,
          usageLimitExecutions: 50_000,
        },
      });

      return user;
    });
  }

  updateRefreshTokenHash(userId: string, refreshTokenHash: string | null) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });
  }

  getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  updateProfile(userId: string, data: { name: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  updateAvatar(userId: string, avatarUrl: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  removeAvatar(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  updateApiKeys(
    userId: string,
    data: {
      openaiApiKeyEnc?: string | null;
      anthropicApiKeyEnc?: string | null;
    },
  ) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }
}

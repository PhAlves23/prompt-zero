import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

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

  createUser(data: { name: string; email: string; passwordHash: string }) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data,
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

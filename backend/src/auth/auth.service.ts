import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { StringValue } from 'ms';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { getEnvSecret } from '../common/utils/env.util';

interface RefreshPayload {
  sub: string;
  email: string;
  sid: string;
  fid: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('errors.emailInUse');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.createUser({
      name: dto.name,
      email: dto.email,
      passwordHash,
    });

    return this.issueTokens(user.id, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('errors.invalidCredentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('errors.invalidCredentials');
    }

    return this.issueTokens(user.id, user.email);
  }

  async refresh(refreshToken: string) {
    let payload: RefreshPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshPayload>(
        refreshToken,
        {
          secret: getEnvSecret(
            this.configService,
            'JWT_REFRESH_SECRET',
            'dev-refresh-secret',
          ),
        },
      );
    } catch {
      throw new UnauthorizedException('errors.invalidRefreshToken');
    }

    const session = await this.prisma.refreshTokenSession.findFirst({
      where: {
        id: payload.sid,
        familyId: payload.fid,
        userId: payload.sub,
      },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      await this.revokeTokenFamily(payload.sub, payload.fid);
      throw new UnauthorizedException('errors.invalidRefreshToken');
    }

    const refreshValid = await bcrypt.compare(refreshToken, session.tokenHash);
    if (!refreshValid) {
      await this.revokeTokenFamily(payload.sub, payload.fid);
      throw new UnauthorizedException('errors.invalidRefreshToken');
    }

    return this.issueTokens(payload.sub, payload.email, {
      familyId: payload.fid,
      parentTokenId: payload.sid,
    });
  }

  async me(userId: string) {
    const profile = await this.usersService.getProfile(userId);
    if (!profile) {
      throw new UnauthorizedException('errors.userNotFound');
    }
    return profile;
  }

  async loginOrRegisterGoogle(profile: {
    googleId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }) {
    const existing = await this.usersService.findByEmail(profile.email);
    if (existing) {
      if (!existing.googleId) {
        await this.prisma.user.update({
          where: { id: existing.id },
          data: { googleId: profile.googleId },
        });
      }
      await this.syncOAuthAvatar(
        existing.id,
        existing.avatarUrl,
        profile.avatarUrl,
      );
      return this.issueTokens(existing.id, existing.email);
    }

    const passwordHash = await bcrypt.hash(randomUUID() + randomUUID(), 10);
    const user = await this.usersService.createUser({
      name: profile.name,
      email: profile.email,
      passwordHash,
      avatarUrl: profile.avatarUrl,
    });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { googleId: profile.googleId },
    });
    return this.issueTokens(user.id, user.email);
  }

  async loginOrRegisterGithub(profile: {
    githubId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }) {
    const byGithub = await this.prisma.user.findUnique({
      where: { githubId: profile.githubId },
    });
    if (byGithub) {
      await this.syncOAuthAvatar(
        byGithub.id,
        byGithub.avatarUrl,
        profile.avatarUrl,
      );
      return this.issueTokens(byGithub.id, byGithub.email);
    }

    const existing = await this.usersService.findByEmail(profile.email);
    if (existing) {
      if (!existing.githubId) {
        await this.prisma.user.update({
          where: { id: existing.id },
          data: { githubId: profile.githubId },
        });
      }
      await this.syncOAuthAvatar(
        existing.id,
        existing.avatarUrl,
        profile.avatarUrl,
      );
      return this.issueTokens(existing.id, existing.email);
    }

    const passwordHash = await bcrypt.hash(randomUUID() + randomUUID(), 10);
    const user = await this.usersService.createUser({
      name: profile.name,
      email: profile.email,
      passwordHash,
      avatarUrl: profile.avatarUrl,
    });
    await this.prisma.user.update({
      where: { id: user.id },
      data: { githubId: profile.githubId },
    });
    return this.issueTokens(user.id, user.email);
  }

  /**
   * Atualiza avatar a partir do OAuth quando ainda não há upload próprio no MinIO.
   */
  private async syncOAuthAvatar(
    userId: string,
    currentAvatarUrl: string | null | undefined,
    oauthAvatarUrl: string | undefined,
  ): Promise<void> {
    const next = oauthAvatarUrl?.trim();
    if (!next) {
      return;
    }
    if (this.isMinioUserAvatar(currentAvatarUrl)) {
      return;
    }
    if (currentAvatarUrl === next) {
      return;
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: next },
    });
  }

  private isMinioUserAvatar(avatarUrl: string | null | undefined): boolean {
    if (!avatarUrl) {
      return false;
    }
    const bucket = this.configService.get<string>(
      'MINIO_BUCKET_NAME',
      'prompt-zero',
    );
    try {
      const pathname = new URL(avatarUrl).pathname;
      return pathname.includes(`/${bucket}/`) && pathname.includes('/avatars/');
    } catch {
      return false;
    }
  }

  private async issueTokens(
    userId: string,
    email: string,
    options?: {
      familyId?: string;
      parentTokenId?: string;
    },
  ) {
    const payload = { sub: userId, email };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: getEnvSecret(
        this.configService,
        'JWT_ACCESS_SECRET',
        'dev-access-secret',
      ),
      expiresIn: this.configService.get<string>(
        'JWT_ACCESS_EXPIRES_IN',
        '15m',
      ) as StringValue,
    });

    const sessionId = randomUUID();
    const familyId = options?.familyId ?? randomUUID();
    const refreshPayload: RefreshPayload = {
      ...payload,
      sid: sessionId,
      fid: familyId,
    };
    const refreshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    ) as StringValue;
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: getEnvSecret(
        this.configService,
        'JWT_REFRESH_SECRET',
        'dev-refresh-secret',
      ),
      expiresIn: refreshExpiresIn,
    });

    const refreshTokenExpiry = this.calculateTokenExpiryDate(refreshExpiresIn);
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.$transaction(async (tx) => {
      await tx.refreshTokenSession.create({
        data: {
          id: sessionId,
          userId,
          familyId,
          parentTokenId: options?.parentTokenId,
          tokenHash: refreshTokenHash,
          expiresAt: refreshTokenExpiry,
        },
      });

      if (options?.parentTokenId) {
        await tx.refreshTokenSession.updateMany({
          where: {
            id: options.parentTokenId,
            userId,
            revokedAt: null,
          },
          data: { revokedAt: new Date() },
        });
      }
    });

    await this.usersService.updateRefreshTokenHash(userId, refreshTokenHash);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async revokeTokenFamily(userId: string, familyId: string) {
    await this.prisma.refreshTokenSession.updateMany({
      where: {
        userId,
        familyId,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  private calculateTokenExpiryDate(expiresIn: StringValue): Date {
    const now = Date.now();
    const value = String(expiresIn);
    if (value.endsWith('m')) {
      return new Date(now + Number.parseInt(value, 10) * 60 * 1000);
    }
    if (value.endsWith('h')) {
      return new Date(now + Number.parseInt(value, 10) * 60 * 60 * 1000);
    }
    if (value.endsWith('d')) {
      return new Date(now + Number.parseInt(value, 10) * 24 * 60 * 60 * 1000);
    }
    return new Date(now + Number.parseInt(value, 10) * 1000);
  }
}

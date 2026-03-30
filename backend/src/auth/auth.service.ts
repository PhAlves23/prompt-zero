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
      throw new ConflictException('Email já está em uso');
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
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
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
      throw new UnauthorizedException('Refresh token inválido');
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
      throw new UnauthorizedException('Refresh token inválido');
    }

    const refreshValid = await bcrypt.compare(refreshToken, session.tokenHash);
    if (!refreshValid) {
      await this.revokeTokenFamily(payload.sub, payload.fid);
      throw new UnauthorizedException('Refresh token inválido');
    }

    return this.issueTokens(payload.sub, payload.email, {
      familyId: payload.fid,
      parentTokenId: payload.sid,
    });
  }

  async me(userId: string) {
    const profile = await this.usersService.getProfile(userId);
    if (!profile) {
      throw new UnauthorizedException('Usuário não encontrado');
    }
    return profile;
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

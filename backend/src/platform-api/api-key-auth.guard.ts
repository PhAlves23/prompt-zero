import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

export const API_KEY_USER_ID = 'apiKeyUserId';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { [API_KEY_USER_ID]?: string }>();
    const raw = req.headers['x-promptzero-api-key'];
    const key = Array.isArray(raw) ? raw[0] : raw;
    if (!key || typeof key !== 'string') {
      throw new UnauthorizedException('errors.apiKeyMissing');
    }
    const prefix = key.slice(0, 12);
    const rows = await this.prisma.platformApiKey.findMany({
      where: { keyPrefix: prefix, revokedAt: null },
    });
    for (const row of rows) {
      const ok = await bcrypt.compare(key, row.keyHash);
      if (ok) {
        req[API_KEY_USER_ID] = row.userId;
        void this.prisma.platformApiKey.update({
          where: { id: row.id },
          data: { lastUsedAt: new Date() },
        });
        return true;
      }
    }
    throw new UnauthorizedException('errors.apiKeyInvalid');
  }
}

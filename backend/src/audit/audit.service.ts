import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    userId?: string | null;
    action: AuditAction;
    resource: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    await this.prisma.auditLog.create({
      data: {
        userId: params.userId ?? undefined,
        action: params.action,
        resource: params.resource,
        metadata: params.metadata as object | undefined,
        ipAddress: params.ipAddress ?? undefined,
        userAgent: params.userAgent ?? undefined,
      },
    });
  }

  list(
    userId: string,
    query: { skip?: number; take?: number; resource?: string },
  ) {
    return this.prisma.auditLog.findMany({
      where: {
        userId,
        ...(query.resource
          ? { resource: { contains: query.resource, mode: 'insensitive' } }
          : {}),
      },
      orderBy: { timestamp: 'desc' },
      skip: query.skip ?? 0,
      take: Math.min(query.take ?? 50, 200),
    });
  }
}

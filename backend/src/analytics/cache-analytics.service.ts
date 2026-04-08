import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getPeriodStartDate, parsePeriod } from '../common/utils/period.util';

@Injectable()
export class CacheAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCacheStats(userId: string, workspaceId?: string, period?: string) {
    const normalized = parsePeriod(period);
    const fromDate = getPeriodStartDate(normalized);

    const where = {
      userId,
      createdAt: { gte: fromDate },
      ...(workspaceId
        ? {
            prompt: { workspaceId },
          }
        : {}),
    };

    const [total, hits, savings] = await this.prisma.$transaction([
      this.prisma.execution.count({ where }),
      this.prisma.execution.count({
        where: { ...where, fromCache: true },
      }),
      this.prisma.execution.aggregate({
        where: { ...where, fromCache: true },
        _sum: { estimatedCost: true, totalTokens: true },
      }),
    ]);

    const hitRate = total === 0 ? 0 : (hits / total) * 100;

    return {
      period: normalized,
      total,
      hits,
      misses: total - hits,
      hitRate: Number(hitRate.toFixed(2)),
      savedCost: Number(savings._sum.estimatedCost ?? 0),
      savedTokens: savings._sum.totalTokens ?? 0,
    };
  }

  async getCacheStatsPerDay(
    userId: string,
    workspaceId?: string,
    period?: string,
  ) {
    const normalized = parsePeriod(period);
    const fromDate = getPeriodStartDate(normalized);

    if (workspaceId) {
      const rows = await this.prisma.$queryRaw<
        Array<{ day: string; total: bigint; hits: bigint }>
      >`SELECT DATE_TRUNC('day', e."createdAt")::date::text AS day,
        COUNT(*)::bigint AS total,
        SUM(CASE WHEN e."fromCache" = true THEN 1 ELSE 0 END)::bigint AS hits
        FROM "Execution" e
        INNER JOIN "Prompt" p ON p."id" = e."promptId"
        WHERE e."userId" = ${userId}
          AND p."workspaceId" = ${workspaceId}
          AND e."createdAt" >= ${fromDate}
        GROUP BY day
        ORDER BY day ASC`;

      return rows.map((row) => {
        const total = Number(row.total);
        const hitCount = Number(row.hits);
        return {
          day: row.day,
          total,
          hits: hitCount,
          misses: total - hitCount,
          hitRate:
            total === 0 ? 0 : Number(((hitCount / total) * 100).toFixed(2)),
        };
      });
    }

    const rows = await this.prisma.$queryRaw<
      Array<{ day: string; total: bigint; hits: bigint }>
    >`SELECT DATE_TRUNC('day', "createdAt")::date::text AS day,
      COUNT(*)::bigint AS total,
      SUM(CASE WHEN "fromCache" = true THEN 1 ELSE 0 END)::bigint AS hits
      FROM "Execution"
      WHERE "userId" = ${userId}
        AND "createdAt" >= ${fromDate}
      GROUP BY day
      ORDER BY day ASC`;

    return rows.map((row) => {
      const total = Number(row.total);
      const hitCount = Number(row.hits);
      return {
        day: row.day,
        total,
        hits: hitCount,
        misses: total - hitCount,
        hitRate:
          total === 0 ? 0 : Number(((hitCount / total) * 100).toFixed(2)),
      };
    });
  }
}

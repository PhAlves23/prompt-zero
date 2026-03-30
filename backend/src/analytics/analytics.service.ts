import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { getPeriodStartDate, parsePeriod } from '../common/utils/period.util';
import { I18nContext } from 'nestjs-i18n';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(userId: string, period?: string) {
    const normalized = parsePeriod(period);
    const fromDate = getPeriodStartDate(normalized);

    const [promptsTotal, executionsTotal, tokensAgg, costAgg] =
      await this.prisma.$transaction([
        this.prisma.prompt.count({
          where: { userId, deletedAt: null },
        }),
        this.prisma.execution.count({
          where: { userId, createdAt: { gte: fromDate } },
        }),
        this.prisma.execution.aggregate({
          where: { userId, createdAt: { gte: fromDate } },
          _sum: { totalTokens: true },
        }),
        this.prisma.execution.aggregate({
          where: { userId, createdAt: { gte: fromDate } },
          _sum: { estimatedCost: true },
        }),
      ]);

    return {
      period: normalized,
      promptsTotal,
      executionsTotal,
      totalTokens: tokensAgg._sum.totalTokens ?? 0,
      totalEstimatedCost: Number(costAgg._sum.estimatedCost ?? 0),
    };
  }

  async getExecutionsPerDay(userId: string, period?: string) {
    const normalized = parsePeriod(period);
    const fromDate = getPeriodStartDate(normalized);

    const rows = await this.prisma.$queryRaw<
      Array<{ day: string; total: bigint }>
    >`SELECT DATE_TRUNC('day', "createdAt")::date::text AS day, COUNT(*)::bigint AS total
      FROM "Execution"
      WHERE "userId" = ${userId}
        AND "createdAt" >= ${fromDate}
      GROUP BY day
      ORDER BY day ASC`;

    return rows.map((row) => ({
      day: row.day,
      total: Number(row.total),
    }));
  }

  async getCostPerModel(userId: string, period?: string) {
    const normalized = parsePeriod(period);
    const fromDate = getPeriodStartDate(normalized);

    const grouped = await this.prisma.execution.groupBy({
      by: ['model'],
      where: { userId, createdAt: { gte: fromDate } },
      _sum: { estimatedCost: true, totalTokens: true },
      _avg: { latencyMs: true },
      orderBy: { _sum: { estimatedCost: 'desc' } },
    });

    return grouped.map((item) => ({
      model: item.model,
      estimatedCost: Number(item._sum.estimatedCost ?? 0),
      totalTokens: item._sum.totalTokens ?? 0,
      avgLatencyMs: Math.round(item._avg.latencyMs ?? 0),
    }));
  }

  async getTopPrompts(userId: string, period?: string, limit = 5) {
    const normalized = parsePeriod(period);
    const fromDate = getPeriodStartDate(normalized);

    const grouped = await this.prisma.execution.groupBy({
      by: ['promptId'],
      where: { userId, createdAt: { gte: fromDate } },
      _count: { promptId: true },
      orderBy: { _count: { promptId: 'desc' } },
      take: limit,
    });

    const promptIds = grouped.map((item) => item.promptId);
    const prompts = await this.prisma.prompt.findMany({
      where: { id: { in: promptIds } },
      select: { id: true, title: true },
    });
    const byId = new Map(prompts.map((prompt) => [prompt.id, prompt.title]));

    return grouped.map((item) => ({
      promptId: item.promptId,
      promptTitle:
        byId.get(item.promptId) ??
        I18nContext.current()?.t('responses.promptRemoved') ??
        'Removed prompt',
      executions: item._count.promptId,
    }));
  }
}

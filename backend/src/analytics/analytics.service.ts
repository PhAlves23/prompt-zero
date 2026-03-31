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

  async getAbHistory(userId: string, period?: string) {
    const normalized = parsePeriod(period);
    const fromDate = getPeriodStartDate(normalized);

    const rows = await this.prisma.$queryRaw<
      Array<{ day: string; votes: bigint; experiments: bigint }>
    >`SELECT DATE_TRUNC('day', v."createdAt")::date::text AS day,
      COUNT(*)::bigint AS votes,
      COUNT(DISTINCT v."experimentId")::bigint AS experiments
      FROM "PromptExperimentVote" v
      INNER JOIN "PromptExperiment" e ON e."id" = v."experimentId"
      WHERE e."userId" = ${userId}
        AND v."createdAt" >= ${fromDate}
      GROUP BY day
      ORDER BY day ASC`;

    return rows.map((row) => ({
      day: row.day,
      votes: Number(row.votes),
      experiments: Number(row.experiments),
    }));
  }

  async getAbRanking(userId: string, period?: string, limit = 5) {
    const normalized = parsePeriod(period);
    const fromDate = getPeriodStartDate(normalized);

    const rows = await this.prisma.$queryRaw<
      Array<{
        experimentId: string;
        votesA: bigint;
        votesB: bigint;
        totalVotes: bigint;
      }>
    >`SELECT v."experimentId",
      SUM(CASE WHEN v."winnerVariant" = 'A' THEN 1 ELSE 0 END)::bigint AS "votesA",
      SUM(CASE WHEN v."winnerVariant" = 'B' THEN 1 ELSE 0 END)::bigint AS "votesB",
      COUNT(*)::bigint AS "totalVotes"
      FROM "PromptExperimentVote" v
      INNER JOIN "PromptExperiment" e ON e."id" = v."experimentId"
      WHERE e."userId" = ${userId}
        AND v."createdAt" >= ${fromDate}
      GROUP BY v."experimentId"
      ORDER BY "totalVotes" DESC
      LIMIT ${limit}`;

    if (rows.length === 0) {
      return [];
    }

    const experiments = await this.prisma.promptExperiment.findMany({
      where: { id: { in: rows.map((row) => row.experimentId) }, userId },
      select: {
        id: true,
        status: true,
        promptA: { select: { title: true } },
        promptB: { select: { title: true } },
      },
    });
    const byId = new Map(experiments.map((item) => [item.id, item]));

    return rows
      .map((row) => {
        const experiment = byId.get(row.experimentId);
        if (!experiment) {
          return null;
        }

        const votesA = Number(row.votesA);
        const votesB = Number(row.votesB);
        const totalVotes = Number(row.totalVotes);
        const winnerVariant = votesA >= votesB ? 'A' : 'B';

        return {
          experimentId: row.experimentId,
          status: experiment.status,
          promptATitle: experiment.promptA.title,
          promptBTitle: experiment.promptB.title,
          votesA,
          votesB,
          totalVotes,
          winnerVariant,
          winnerPercent:
            totalVotes === 0
              ? 0
              : Number(
                  (
                    ((winnerVariant === 'A' ? votesA : votesB) / totalVotes) *
                    100
                  ).toFixed(2),
                ),
        };
      })
      .filter((item) => item !== null);
  }
}

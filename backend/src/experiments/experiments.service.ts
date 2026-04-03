import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ExperimentStatus,
  ExperimentVariant,
  Prisma,
  WorkspaceRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ExecutionsService } from '../executions/executions.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { CreateExperimentDto } from './dto/create-experiment.dto';
import { VoteExperimentDto } from './dto/vote-experiment.dto';
import { RunExperimentDto } from './dto/run-experiment.dto';
import { RedisService } from '../redis/redis.service';
import { extractTemplateVariables } from '../common/utils/template.util';

@Injectable()
export class ExperimentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly executionsService: ExecutionsService,
    private readonly redisService: RedisService,
    private readonly workspaceAccess: WorkspaceAccessService,
  ) {}

  async createExperiment(userId: string, dto: CreateExperimentDto) {
    if (dto.promptAId === dto.promptBId) {
      throw new BadRequestException('errors.experimentPromptsMustDiffer');
    }

    const accessible =
      await this.workspaceAccess.getAccessibleWorkspaceIds(userId);
    const prompts = await this.prisma.prompt.findMany({
      where: {
        id: { in: [dto.promptAId, dto.promptBId] },
        deletedAt: null,
        OR: [
          { userId },
          ...(accessible.length ? [{ workspaceId: { in: accessible } }] : []),
        ],
      },
      select: { id: true },
    });

    if (prompts.length !== 2) {
      throw new NotFoundException('errors.experimentPromptNotFound');
    }

    return this.prisma.promptExperiment.create({
      data: {
        userId,
        promptAId: dto.promptAId,
        promptBId: dto.promptBId,
        sampleSizeTarget: dto.sampleSizeTarget,
        trafficSplitA: dto.trafficSplitA ?? 50,
      },
    });
  }

  async listExperiments(userId: string) {
    const experiments = await this.prisma.promptExperiment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        promptAId: true,
        promptBId: true,
        trafficSplitA: true,
        sampleSizeTarget: true,
        startedAt: true,
        endedAt: true,
        createdAt: true,
        promptA: { select: { title: true } },
        promptB: { select: { title: true } },
      },
    });

    if (experiments.length === 0) {
      return [];
    }

    const groupedVotes = await this.prisma.promptExperimentVote.groupBy({
      by: ['experimentId', 'winnerVariant'],
      where: { experimentId: { in: experiments.map((item) => item.id) } },
      _count: { winnerVariant: true },
    });

    const votesByExperiment = new Map<
      string,
      { votesA: number; votesB: number; totalVotes: number }
    >();

    for (const row of groupedVotes) {
      const current = votesByExperiment.get(row.experimentId) ?? {
        votesA: 0,
        votesB: 0,
        totalVotes: 0,
      };
      const value = row._count.winnerVariant ?? 0;
      if (row.winnerVariant === ExperimentVariant.A) {
        current.votesA = value;
      } else {
        current.votesB = value;
      }
      current.totalVotes = current.votesA + current.votesB;
      votesByExperiment.set(row.experimentId, current);
    }

    return experiments.map((experiment) => {
      const votes = votesByExperiment.get(experiment.id) ?? {
        votesA: 0,
        votesB: 0,
        totalVotes: 0,
      };
      return {
        id: experiment.id,
        status: experiment.status,
        promptAId: experiment.promptAId,
        promptBId: experiment.promptBId,
        promptATitle: experiment.promptA.title,
        promptBTitle: experiment.promptB.title,
        trafficSplitA: experiment.trafficSplitA,
        trafficSplitB: 100 - experiment.trafficSplitA,
        sampleSizeTarget: experiment.sampleSizeTarget,
        startedAt: experiment.startedAt,
        endedAt: experiment.endedAt,
        createdAt: experiment.createdAt,
        votesA: votes.votesA,
        votesB: votes.votesB,
        totalVotes: votes.totalVotes,
        percentA: this.calculatePercentage(votes.votesA, votes.totalVotes),
        percentB: this.calculatePercentage(votes.votesB, votes.totalVotes),
      };
    });
  }

  async runExperiment(
    userId: string,
    experimentId: string,
    dto: RunExperimentDto,
    requestId?: string,
  ) {
    const experiment = await this.prisma.promptExperiment.findUnique({
      where: { id: experimentId },
      select: {
        id: true,
        userId: true,
        status: true,
        promptAId: true,
        promptBId: true,
        trafficSplitA: true,
      },
    });

    if (!experiment) {
      throw new NotFoundException('errors.experimentNotFound');
    }
    if (experiment.userId !== userId) {
      throw new ForbiddenException('errors.experimentForbidden');
    }
    if (experiment.status !== ExperimentStatus.running) {
      throw new BadRequestException('errors.experimentNotRunning');
    }

    const normalizedSplitA = this.normalizeTrafficSplitA(
      Number(experiment.trafficSplitA ?? 50),
    );
    const chosenVariant =
      Math.random() * 100 < normalizedSplitA
        ? ExperimentVariant.A
        : ExperimentVariant.B;
    const promptId =
      chosenVariant === ExperimentVariant.A
        ? experiment.promptAId
        : experiment.promptBId;

    const prompt = await this.prisma.prompt.findFirst({
      where: { id: promptId, deletedAt: null },
      include: { variables: true },
    });
    if (!prompt) {
      throw new NotFoundException('errors.promptNotFound');
    }
    const canRun = await this.workspaceAccess.canAccessPrompt(
      userId,
      prompt,
      WorkspaceRole.viewer,
    );
    if (!canRun) {
      throw new NotFoundException('errors.promptNotFound');
    }

    const mergedVariables = this.mergeExperimentVariables(
      prompt,
      dto.variables,
    );
    const model = dto.model ?? prompt.model;

    const executionResult = await this.executionsService.executePrompt(
      userId,
      promptId,
      {
        model,
        provider: dto.provider,
        credentialId: dto.credentialId,
        temperature: dto.temperature,
        maxTokens: dto.maxTokens,
        topP: dto.topP,
        topK: dto.topK,
        variables: mergedVariables,
      },
    );

    const exposure = await this.prisma.promptExperimentExposure.create({
      data: {
        experimentId: experiment.id,
        requestId: requestId ?? randomUUID(),
        chosenVariant,
        executionId: executionResult.execution.id,
      },
    });

    return {
      experimentId: experiment.id,
      promptId,
      variant: chosenVariant,
      exposureId: exposure.id,
      output: executionResult.output,
      meta: executionResult.meta,
    };
  }

  async voteExperiment(
    userId: string,
    experimentId: string,
    dto: VoteExperimentDto,
  ) {
    const experiment = await this.prisma.promptExperiment.findUnique({
      where: { id: experimentId },
      select: { id: true, userId: true, status: true },
    });

    if (!experiment) {
      throw new NotFoundException('errors.experimentNotFound');
    }
    if (experiment.userId !== userId) {
      throw new ForbiddenException('errors.experimentForbidden');
    }
    if (experiment.status !== ExperimentStatus.running) {
      throw new BadRequestException('errors.experimentNotRunning');
    }

    const exposure = await this.prisma.promptExperimentExposure.findUnique({
      where: { id: dto.exposureId },
      select: { id: true, experimentId: true },
    });
    if (!exposure || exposure.experimentId !== experimentId) {
      throw new NotFoundException('errors.experimentExposureNotFound');
    }

    try {
      await this.prisma.promptExperimentVote.create({
        data: {
          experimentId,
          exposureId: dto.exposureId,
          winnerVariant: dto.winnerVariant,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('errors.experimentVoteAlreadyRegistered');
        }
      }
      throw error;
    }

    await this.redisService.incrementVoteCounters(
      experimentId,
      dto.winnerVariant,
    );

    return this.getResults(userId, experimentId);
  }

  async getResults(userId: string, experimentId: string) {
    const experiment = await this.prisma.promptExperiment.findUnique({
      where: { id: experimentId },
      select: {
        id: true,
        userId: true,
        status: true,
        startedAt: true,
        endedAt: true,
        trafficSplitA: true,
      },
    });

    if (!experiment) {
      throw new NotFoundException('errors.experimentNotFound');
    }
    if (experiment.userId !== userId) {
      throw new ForbiddenException('errors.experimentForbidden');
    }

    let counters = await this.redisService.getVoteCounters(experimentId);
    if (!counters) {
      const grouped = await this.prisma.promptExperimentVote.groupBy({
        by: ['winnerVariant'],
        where: { experimentId },
        _count: { winnerVariant: true },
      });

      const votesAData = grouped.find(
        (item) => item.winnerVariant === ExperimentVariant.A,
      );
      const votesBData = grouped.find(
        (item) => item.winnerVariant === ExperimentVariant.B,
      );
      const votesA = votesAData?._count.winnerVariant ?? 0;
      const votesB = votesBData?._count.winnerVariant ?? 0;
      counters = {
        A: votesA,
        B: votesB,
        total: votesA + votesB,
      };
      await this.redisService.setVoteCounters(experimentId, counters);
    }

    const configuredSplitA = this.normalizeTrafficSplitA(
      Number(experiment.trafficSplitA ?? 50),
    );

    return {
      experimentId,
      status: experiment.status,
      trafficSplitA: configuredSplitA,
      trafficSplitB: 100 - configuredSplitA,
      startedAt: experiment.startedAt,
      endedAt: experiment.endedAt,
      votesA: counters.A,
      votesB: counters.B,
      totalVotes: counters.total,
      percentA: this.calculatePercentage(counters.A, counters.total),
      percentB: this.calculatePercentage(counters.B, counters.total),
    };
  }

  async stopExperiment(userId: string, experimentId: string) {
    const experiment = await this.prisma.promptExperiment.findUnique({
      where: { id: experimentId },
      select: { id: true, userId: true, status: true },
    });

    if (!experiment) {
      throw new NotFoundException('errors.experimentNotFound');
    }
    if (experiment.userId !== userId) {
      throw new ForbiddenException('errors.experimentForbidden');
    }
    if (experiment.status === ExperimentStatus.stopped) {
      return this.getResults(userId, experimentId);
    }

    await this.prisma.promptExperiment.update({
      where: { id: experimentId },
      data: {
        status: ExperimentStatus.stopped,
        endedAt: new Date(),
      },
    });

    return this.getResults(userId, experimentId);
  }

  private mergeExperimentVariables(
    prompt: {
      content: string;
      isTemplate: boolean;
      variables: { name: string; defaultValue: string | null }[];
    },
    dtoVariables?: Record<string, string>,
  ): Record<string, string> | undefined {
    if (!prompt.isTemplate) {
      return dtoVariables;
    }
    const names = extractTemplateVariables(prompt.content);
    const defaults: Record<string, string> = {};
    for (const v of prompt.variables) {
      if (v.defaultValue != null && String(v.defaultValue).trim() !== '') {
        defaults[v.name] = String(v.defaultValue);
      }
    }
    const provided = dtoVariables ?? {};
    const merged: Record<string, string> = {};
    for (const name of names) {
      const raw = provided[name];
      const fromUser =
        raw !== undefined && String(raw).trim() !== ''
          ? String(raw).trim()
          : undefined;
      const fromDefault = defaults[name];
      if (fromUser !== undefined) {
        merged[name] = fromUser;
      } else if (fromDefault !== undefined) {
        merged[name] = fromDefault;
      }
    }
    return merged;
  }

  private calculatePercentage(value: number, total: number): number {
    if (total === 0) {
      return 0;
    }
    return Number(((value / total) * 100).toFixed(2));
  }

  private normalizeTrafficSplitA(value: number): number {
    if (!Number.isFinite(value)) {
      return 50;
    }
    if (value < 1) {
      return 1;
    }
    if (value > 99) {
      return 99;
    }
    return Math.round(value);
  }
}

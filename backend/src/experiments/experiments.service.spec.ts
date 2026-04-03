import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ExperimentStatus, ExperimentVariant, Prisma } from '@prisma/client';
import { ExperimentsService } from './experiments.service';
import { PrismaService } from '../prisma/prisma.service';
import { ExecutionsService } from '../executions/executions.service';
import { RedisService } from '../redis/redis.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { WebhooksService } from '../webhooks/webhooks.service';

describe('ExperimentsService', () => {
  let service: ExperimentsService;

  const prismaServiceMock = {
    prompt: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    promptExperiment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    promptExperimentExposure: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    promptExperimentVote: {
      create: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  const executionsServiceMock = {
    executePrompt: jest.fn(),
  };

  const redisServiceMock = {
    incrementVoteCounters: jest.fn(),
    getVoteCounters: jest.fn(),
    setVoteCounters: jest.fn(),
  };

  const workspaceAccessMock = {
    getAccessibleWorkspaceIds: jest.fn().mockResolvedValue([]),
    canAccessPrompt: jest.fn().mockResolvedValue(true),
  };

  const webhooksServiceMock = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExperimentsService,
        { provide: PrismaService, useValue: prismaServiceMock },
        { provide: ExecutionsService, useValue: executionsServiceMock },
        { provide: RedisService, useValue: redisServiceMock },
        { provide: WorkspaceAccessService, useValue: workspaceAccessMock },
        { provide: WebhooksService, useValue: webhooksServiceMock },
      ],
    }).compile();

    service = module.get<ExperimentsService>(ExperimentsService);
  });

  it('deve rejeitar criação quando prompt A e B são iguais', async () => {
    await expect(
      service.createExperiment('user-1', {
        promptAId: 'prompt-1',
        promptBId: 'prompt-1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deve executar rodada A/B e criar exposição', async () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.79);
    prismaServiceMock.promptExperiment.findUnique.mockResolvedValue({
      id: 'exp-1',
      userId: 'user-1',
      status: ExperimentStatus.running,
      promptAId: 'prompt-a',
      promptBId: 'prompt-b',
      trafficSplitA: 80,
    });
    executionsServiceMock.executePrompt.mockResolvedValue({
      output: 'saida',
      execution: { id: 'exec-1' },
      meta: {
        model: 'gpt-4o-mini',
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
        latencyMs: 1000,
        estimatedCost: 0.0012,
        pricingSource: 'fallback',
      },
    });
    prismaServiceMock.promptExperimentExposure.create.mockResolvedValue({
      id: 'exposure-1',
    });
    prismaServiceMock.prompt.findFirst.mockResolvedValue({
      id: 'prompt-a',
      content: 'texto fixo',
      isTemplate: false,
      model: 'gpt-4o-mini',
      variables: [],
    });

    const result = await service.runExperiment(
      'user-1',
      'exp-1',
      { model: 'gpt-4o-mini' },
      'request-1',
    );

    expect(result.exposureId).toBe('exposure-1');
    expect(executionsServiceMock.executePrompt).toHaveBeenCalledWith(
      'user-1',
      'prompt-a',
      expect.objectContaining({ model: 'gpt-4o-mini' }),
    );
    randomSpy.mockRestore();
  });

  it('deve rejeitar voto quando usuário não é dono do experimento', async () => {
    prismaServiceMock.promptExperiment.findUnique.mockResolvedValue({
      id: 'exp-1',
      userId: 'user-2',
      status: ExperimentStatus.running,
    });

    await expect(
      service.voteExperiment('user-1', 'exp-1', {
        exposureId: 'exposure-1',
        winnerVariant: ExperimentVariant.A,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('deve impedir voto duplicado por exposição', async () => {
    prismaServiceMock.promptExperiment.findUnique.mockResolvedValue({
      id: 'exp-1',
      userId: 'user-1',
      status: ExperimentStatus.running,
    });
    prismaServiceMock.promptExperimentExposure.findUnique.mockResolvedValue({
      id: 'exposure-1',
      experimentId: 'exp-1',
    });
    prismaServiceMock.promptExperimentVote.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '0.0.0',
      }),
    );

    await expect(
      service.voteExperiment('user-1', 'exp-1', {
        exposureId: 'exposure-1',
        winnerVariant: ExperimentVariant.B,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('deve retornar resultados do Redis quando disponível', async () => {
    prismaServiceMock.promptExperiment.findUnique.mockResolvedValue({
      id: 'exp-1',
      userId: 'user-1',
      status: ExperimentStatus.running,
      trafficSplitA: 50,
      startedAt: new Date('2026-03-30T00:00:00.000Z'),
      endedAt: null,
    });
    redisServiceMock.getVoteCounters.mockResolvedValue({
      A: 7,
      B: 3,
      total: 10,
    });

    const result = await service.getResults('user-1', 'exp-1');

    expect(result.percentA).toBe(70);
    expect(result.percentB).toBe(30);
    expect(
      prismaServiceMock.promptExperimentVote.groupBy,
    ).not.toHaveBeenCalled();
  });
});

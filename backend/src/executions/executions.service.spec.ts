import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ProviderType } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { ExecutionsService } from './executions.service';
import { PrismaService } from '../prisma/prisma.service';
import { LlmService } from './llm.service';
import { encryptText } from '../common/utils/crypto.util';
import { ProviderPricingService } from './provider-pricing.service';
import { getToken } from '@willsoto/nestjs-prometheus';
import {
  LLM_EXECUTION_DURATION_METRIC,
  LLM_EXECUTIONS_TOTAL_METRIC,
  LLM_TOKENS_TOTAL_METRIC,
} from '../metrics/metrics.constants';
import { BillingService } from '../billing/billing.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { WebhooksService } from '../webhooks/webhooks.service';

describe('ExecutionsService', () => {
  let service: ExecutionsService;

  const prismaServiceMock = {
    prompt: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    providerCredential: {
      findFirst: jest.fn(),
    },
    execution: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const llmServiceMock = {
    execute: jest.fn(),
  };

  const configServiceMock = {
    get: jest.fn(() => undefined),
  };

  const providerPricingServiceMock = {
    getPricing: jest.fn().mockResolvedValue({
      input: 0.001,
      output: 0.002,
      source: 'fallback',
    }),
  };

  const llmExecutionsTotalMetricMock = {
    inc: jest.fn(),
  };

  const llmExecutionDurationMetricMock = {
    observe: jest.fn(),
  };

  const llmTokensTotalMetricMock = {
    inc: jest.fn(),
  };

  const billingServiceMock = {
    assertWithinExecutionLimit: jest.fn().mockResolvedValue(undefined),
  };

  const workspaceAccessMock = {
    canAccessPrompt: jest.fn().mockResolvedValue(true),
  };

  const webhooksServiceMock = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaServiceMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      openaiApiKeyEnc: null,
      anthropicApiKeyEnc: null,
    } as never);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecutionsService,
        { provide: PrismaService, useValue: prismaServiceMock },
        { provide: LlmService, useValue: llmServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
        {
          provide: ProviderPricingService,
          useValue: providerPricingServiceMock,
        },
        {
          provide: getToken(LLM_EXECUTIONS_TOTAL_METRIC),
          useValue: llmExecutionsTotalMetricMock,
        },
        {
          provide: getToken(LLM_EXECUTION_DURATION_METRIC),
          useValue: llmExecutionDurationMetricMock,
        },
        {
          provide: getToken(LLM_TOKENS_TOTAL_METRIC),
          useValue: llmTokensTotalMetricMock,
        },
        { provide: BillingService, useValue: billingServiceMock },
        { provide: WorkspaceAccessService, useValue: workspaceAccessMock },
        { provide: WebhooksService, useValue: webhooksServiceMock },
      ],
    }).compile();

    service = module.get<ExecutionsService>(ExecutionsService);
  });

  it('deve retornar 400 quando credentialId não existe para o usuário/provedor', async () => {
    prismaServiceMock.prompt.findUnique.mockResolvedValue({
      id: 'prompt-1',
      userId: 'user-1',
      deletedAt: null,
      content: 'Escreva um texto sobre produtividade',
      isTemplate: false,
      variables: [],
      versions: [{ id: 'version-1', versionNumber: 1 }],
      user: {
        id: 'user-1',
        openaiApiKeyEnc: null,
        anthropicApiKeyEnc: null,
      },
    });
    prismaServiceMock.providerCredential.findFirst.mockResolvedValue(null);

    await expect(
      service.executePrompt('user-1', 'prompt-1', {
        model: 'gpt-4o-mini',
        provider: ProviderType.openai,
        credentialId: 'cred-inexistente',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(llmServiceMock.execute).not.toHaveBeenCalled();
  });

  it('deve inferir provider=openrouter a partir do model e executar com credencial default', async () => {
    const encryptedKey = encryptText('openrouter-key', 'dev-encryption-secret');

    prismaServiceMock.prompt.findUnique.mockResolvedValue({
      id: 'prompt-1',
      userId: 'user-1',
      deletedAt: null,
      content: 'Gere um texto para anúncio',
      isTemplate: false,
      variables: [],
      versions: [{ id: 'version-1', versionNumber: 1 }],
      user: {
        id: 'user-1',
        openaiApiKeyEnc: null,
        anthropicApiKeyEnc: null,
      },
    });
    prismaServiceMock.providerCredential.findFirst.mockResolvedValue({
      id: 'cred-openrouter',
      provider: ProviderType.openrouter,
      apiKeyEnc: encryptedKey,
      baseUrl: 'https://openrouter.ai/api/v1',
      organizationId: null,
      isActive: true,
      isDefault: true,
    });
    llmServiceMock.execute.mockResolvedValue({
      output: 'Texto gerado',
      inputTokens: 20,
      outputTokens: 30,
    });
    prismaServiceMock.execution.create.mockResolvedValue({ id: 'exec-1' });

    await service.executePrompt('user-1', 'prompt-1', {
      model: 'openrouter/openai/gpt-4o-mini',
    });

    expect(prismaServiceMock.providerCredential.findFirst).toHaveBeenCalledWith(
      {
        where: {
          userId: 'user-1',
          provider: ProviderType.openrouter,
          isActive: true,
        },
        orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
      },
    );
    expect(llmServiceMock.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: ProviderType.openrouter,
        model: 'openrouter/openai/gpt-4o-mini',
      }),
    );
    expect(llmExecutionsTotalMetricMock.inc).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: ProviderType.openrouter,
        model: 'openrouter/openai/gpt-4o-mini',
        status: 'success',
      }),
    );
    expect(llmExecutionDurationMetricMock.observe).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: ProviderType.openrouter,
        model: 'openrouter/openai/gpt-4o-mini',
        status: 'success',
      }),
      expect.any(Number),
    );
    expect(llmTokensTotalMetricMock.inc).toHaveBeenCalledTimes(3);
  });

  it('deve inferir provider=google a partir de model gemini e usar credencial default', async () => {
    const encryptedKey = encryptText('google-key', 'dev-encryption-secret');

    prismaServiceMock.prompt.findUnique.mockResolvedValue({
      id: 'prompt-1',
      userId: 'user-1',
      deletedAt: null,
      content: 'Resuma este conteúdo',
      isTemplate: false,
      variables: [],
      versions: [{ id: 'version-1', versionNumber: 1 }],
      user: {
        id: 'user-1',
        openaiApiKeyEnc: null,
        anthropicApiKeyEnc: null,
      },
    });
    prismaServiceMock.providerCredential.findFirst.mockResolvedValue({
      id: 'cred-google',
      provider: ProviderType.google,
      apiKeyEnc: encryptedKey,
      baseUrl: null,
      organizationId: null,
      isActive: true,
      isDefault: true,
    });
    llmServiceMock.execute.mockResolvedValue({
      output: 'Resumo gerado',
      inputTokens: 12,
      outputTokens: 18,
    });
    prismaServiceMock.execution.create.mockResolvedValue({ id: 'exec-2' });

    await service.executePrompt('user-1', 'prompt-1', {
      model: 'gemini-1.5-flash',
    });

    expect(prismaServiceMock.providerCredential.findFirst).toHaveBeenCalledWith(
      {
        where: {
          userId: 'user-1',
          provider: ProviderType.google,
          isActive: true,
        },
        orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
      },
    );
    expect(llmServiceMock.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: ProviderType.google,
        model: 'gemini-1.5-flash',
      }),
    );
  });

  it('deve inferir provider=anthropic a partir de model claude e usar fallback legado no user', async () => {
    const encryptedAnthropicKey = encryptText(
      'anthropic-key',
      'dev-encryption-secret',
    );

    prismaServiceMock.prompt.findUnique.mockResolvedValue({
      id: 'prompt-1',
      userId: 'user-1',
      deletedAt: null,
      content: 'Escreva uma proposta comercial',
      isTemplate: false,
      variables: [],
      versions: [{ id: 'version-1', versionNumber: 1 }],
    });
    prismaServiceMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      openaiApiKeyEnc: null,
      anthropicApiKeyEnc: encryptedAnthropicKey,
    } as never);
    prismaServiceMock.providerCredential.findFirst.mockResolvedValue(null);
    llmServiceMock.execute.mockResolvedValue({
      output: 'Proposta gerada',
      inputTokens: 40,
      outputTokens: 55,
    });
    prismaServiceMock.execution.create.mockResolvedValue({ id: 'exec-3' });

    await service.executePrompt('user-1', 'prompt-1', {
      model: 'claude-3-5-sonnet',
    });

    expect(prismaServiceMock.providerCredential.findFirst).toHaveBeenCalledWith(
      {
        where: {
          userId: 'user-1',
          provider: ProviderType.anthropic,
          isActive: true,
        },
        orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
      },
    );
    expect(llmServiceMock.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: ProviderType.anthropic,
        model: 'claude-3-5-sonnet',
      }),
    );
  });
});

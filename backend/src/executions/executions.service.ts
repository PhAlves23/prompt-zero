import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ExecutePromptDto } from './dto/execute-prompt.dto';
import { LlmService } from './llm.service';
import { decryptText } from '../common/utils/crypto.util';
import {
  applyTemplateVariables,
  extractTemplateVariables,
} from '../common/utils/template.util';
import { ListExecutionsQueryDto } from './dto/list-executions-query.dto';
import { getEnvSecret } from '../common/utils/env.util';
import { ProviderType, User, WorkspaceRole } from '@prisma/client';
import { ProviderPricingService } from './provider-pricing.service';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';
import {
  LLM_EXECUTION_DURATION_METRIC,
  LLM_EXECUTIONS_TOTAL_METRIC,
  LLM_TOKENS_TOTAL_METRIC,
} from '../metrics/metrics.constants';
import { BillingService } from '../billing/billing.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { WebhooksService } from '../webhooks/webhooks.service';

@Injectable()
export class ExecutionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LlmService,
    private readonly configService: ConfigService,
    private readonly providerPricingService: ProviderPricingService,
    private readonly billingService: BillingService,
    private readonly workspaceAccess: WorkspaceAccessService,
    private readonly webhooksService: WebhooksService,
    @InjectMetric(LLM_EXECUTIONS_TOTAL_METRIC)
    private readonly llmExecutionsTotal: Counter<string>,
    @InjectMetric(LLM_EXECUTION_DURATION_METRIC)
    private readonly llmExecutionDuration: Histogram<string>,
    @InjectMetric(LLM_TOKENS_TOTAL_METRIC)
    private readonly llmTokensTotal: Counter<string>,
  ) {}

  async executePrompt(userId: string, promptId: string, dto: ExecutePromptDto) {
    await this.billingService.assertWithinExecutionLimit(userId);

    const prompt = await this.prisma.prompt.findUnique({
      where: { id: promptId },
      include: {
        versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
        variables: true,
      },
    });

    if (!prompt || prompt.deletedAt) {
      throw new NotFoundException('errors.promptNotFound');
    }
    const canRun = await this.workspaceAccess.canAccessPrompt(
      userId,
      prompt,
      WorkspaceRole.viewer,
    );
    if (!canRun) {
      throw new ForbiddenException('errors.promptExecuteForbidden');
    }

    const actingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!actingUser) {
      throw new ForbiddenException('errors.userNotFound');
    }

    const templateVariables = extractTemplateVariables(prompt.content);
    const providedVariables = dto.variables ?? {};
    if (prompt.isTemplate) {
      const configured = new Set(
        prompt.variables.map((variable) => variable.name),
      );
      const unconfigured = templateVariables.filter(
        (variableName) => !configured.has(variableName),
      );
      if (unconfigured.length > 0) {
        throw new BadRequestException('errors.templateVariablesNotConfigured');
      }

      const missing = templateVariables.filter(
        (name) => !providedVariables[name],
      );
      if (missing.length > 0) {
        throw new BadRequestException('errors.requiredVariablesMissing');
      }
    }

    const finalPrompt = prompt.isTemplate
      ? applyTemplateVariables(prompt.content, providedVariables)
      : prompt.content;

    const provider = this.resolveProvider(dto.model, dto.provider);
    const credential = await this.resolveCredential(
      userId,
      provider,
      dto.credentialId,
    );
    const apiKey = this.resolveApiKey(
      provider,
      actingUser,
      credential?.apiKeyEnc,
    );
    const temperature = dto.temperature ?? 0.7;
    const maxTokens = dto.maxTokens ?? 512;
    const topP = dto.topP ?? 0.95;
    const topK = dto.topK ?? 40;

    const startedAt = Date.now();
    let llmResult: Awaited<ReturnType<LlmService['execute']>>;
    try {
      llmResult = await this.llmService.execute({
        provider,
        apiKey,
        model: dto.model,
        prompt: finalPrompt,
        temperature,
        maxTokens,
        topP,
        topK,
        baseUrl: credential?.baseUrl,
        organizationId: credential?.organizationId,
      });
    } catch (error) {
      this.recordExecutionMetrics(
        provider,
        dto.model,
        'error',
        Date.now() - startedAt,
      );
      const message =
        error instanceof Error ? error.message : 'execution_failed';
      void this.webhooksService.emit(userId, 'execution.failed', {
        promptId,
        model: dto.model,
        workspaceId: prompt.workspaceId ?? undefined,
        error: message,
      });
      throw error;
    }

    const latencyMs = Date.now() - startedAt;
    this.recordExecutionMetrics(provider, dto.model, 'success', latencyMs);
    const totalTokens = llmResult.inputTokens + llmResult.outputTokens;
    this.llmTokensTotal.inc(
      { provider, model: dto.model, type: 'input' },
      llmResult.inputTokens,
    );
    this.llmTokensTotal.inc(
      { provider, model: dto.model, type: 'output' },
      llmResult.outputTokens,
    );
    this.llmTokensTotal.inc(
      { provider, model: dto.model, type: 'total' },
      totalTokens,
    );
    const { estimatedCost, pricingSource } = await this.calculateEstimatedCost(
      provider,
      dto.model,
      llmResult.inputTokens,
      llmResult.outputTokens,
    );

    const latestVersion = prompt.versions[0];
    if (!latestVersion) {
      throw new NotFoundException('errors.promptVersionNotFound');
    }

    const execution = await this.prisma.execution.create({
      data: {
        provider,
        input: finalPrompt,
        output: llmResult.output,
        model: dto.model,
        credentialId: credential?.id,
        temperature,
        maxTokens,
        inputTokens: llmResult.inputTokens,
        outputTokens: llmResult.outputTokens,
        totalTokens,
        latencyMs,
        estimatedCost,
        variables: prompt.isTemplate ? providedVariables : undefined,
        promptId,
        promptVersionId: latestVersion.id,
        userId,
      },
    });

    void this.webhooksService.emit(userId, 'execution.completed', {
      executionId: execution.id,
      promptId,
      model: dto.model,
      workspaceId: prompt.workspaceId ?? undefined,
    });

    return {
      output: llmResult.output,
      execution,
      meta: {
        model: dto.model,
        inputTokens: llmResult.inputTokens,
        outputTokens: llmResult.outputTokens,
        totalTokens,
        latencyMs,
        estimatedCost: Number(estimatedCost),
        pricingSource,
      },
    };
  }

  async listPromptExecutions(
    userId: string,
    promptId: string,
    query: ListExecutionsQueryDto,
  ) {
    const prompt = await this.prisma.prompt.findUnique({
      where: { id: promptId },
    });

    if (!prompt || prompt.deletedAt) {
      throw new NotFoundException('errors.promptNotFound');
    }
    const canRead = await this.workspaceAccess.canAccessPrompt(
      userId,
      prompt,
      WorkspaceRole.viewer,
    );
    if (!canRead) {
      throw new ForbiddenException('errors.promptForbidden');
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.execution.findMany({
        where: { promptId, userId },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.execution.count({
        where: { promptId, userId },
      }),
    ]);

    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  private resolveProvider(
    model: string,
    providerFromPayload?: ProviderType,
  ): ProviderType {
    if (providerFromPayload) {
      return providerFromPayload;
    }

    const normalized = model.toLowerCase();
    if (
      normalized.startsWith('openrouter/') ||
      normalized.includes('openrouter')
    ) {
      return ProviderType.openrouter;
    }
    if (normalized.includes('gemini')) {
      return ProviderType.google;
    }
    if (normalized.includes('claude')) {
      return ProviderType.anthropic;
    }
    return ProviderType.openai;
  }

  private async resolveCredential(
    userId: string,
    provider: ProviderType,
    credentialId?: string,
  ) {
    if (credentialId) {
      const credential = await this.prisma.providerCredential.findFirst({
        where: {
          id: credentialId,
          userId,
          provider,
          isActive: true,
        },
      });
      if (!credential) {
        throw new BadRequestException('errors.providerCredentialNotFound');
      }
      return credential;
    }

    return this.prisma.providerCredential.findFirst({
      where: {
        userId,
        provider,
        isActive: true,
      },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  private resolveApiKey(
    provider: ProviderType,
    user: User,
    credentialApiKeyEnc?: string | null,
  ): string {
    const encryptionSecret = getEnvSecret(
      this.configService,
      'ENCRYPTION_SECRET',
      'dev-encryption-secret',
    );

    if (credentialApiKeyEnc) {
      return decryptText(credentialApiKeyEnc, encryptionSecret);
    }

    if (provider === ProviderType.openai) {
      if (!user.openaiApiKeyEnc) {
        throw new BadRequestException('errors.openaiApiKeyNotConfigured');
      }
      return decryptText(user.openaiApiKeyEnc, encryptionSecret);
    }

    if (provider === ProviderType.anthropic) {
      if (!user.anthropicApiKeyEnc) {
        throw new BadRequestException('errors.anthropicApiKeyNotConfigured');
      }
      return decryptText(user.anthropicApiKeyEnc, encryptionSecret);
    }

    throw new BadRequestException('errors.providerApiKeyNotConfigured');
  }

  private async calculateEstimatedCost(
    provider: ProviderType,
    model: string,
    inputTokens: number,
    outputTokens: number,
  ): Promise<{ estimatedCost: number; pricingSource: 'dynamic' | 'fallback' }> {
    const pricingPer1k = await this.providerPricingService.getPricing(
      provider,
      model,
    );
    const inputCost = (inputTokens / 1000) * pricingPer1k.input;
    const outputCost = (outputTokens / 1000) * pricingPer1k.output;
    return {
      estimatedCost: Number((inputCost + outputCost).toFixed(6)),
      pricingSource: pricingPer1k.source,
    };
  }

  private recordExecutionMetrics(
    provider: ProviderType,
    model: string,
    status: 'success' | 'error',
    latencyMs: number,
  ): void {
    const labels = { provider, model, status };
    this.llmExecutionsTotal.inc(labels);
    this.llmExecutionDuration.observe(labels, latencyMs / 1000);
  }
}

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

@Injectable()
export class ExecutionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LlmService,
    private readonly configService: ConfigService,
  ) {}

  async executePrompt(userId: string, promptId: string, dto: ExecutePromptDto) {
    const prompt = await this.prisma.prompt.findUnique({
      where: { id: promptId },
      include: {
        versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
        variables: true,
        user: true,
      },
    });

    if (!prompt || prompt.deletedAt) {
      throw new NotFoundException('Prompt não encontrado');
    }
    if (prompt.userId !== userId) {
      throw new ForbiddenException('Sem permissão para executar este prompt');
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
        throw new BadRequestException(
          `Template sem configuração para variáveis: ${unconfigured.join(', ')}`,
        );
      }

      const missing = templateVariables.filter(
        (name) => !providedVariables[name],
      );
      if (missing.length > 0) {
        throw new BadRequestException(
          `Variáveis obrigatórias ausentes: ${missing.join(', ')}`,
        );
      }
    }

    const finalPrompt = prompt.isTemplate
      ? applyTemplateVariables(prompt.content, providedVariables)
      : prompt.content;

    const provider = this.resolveProvider(dto.model);
    const apiKey = this.resolveApiKey(provider, prompt.user);
    const temperature = dto.temperature ?? 0.7;
    const maxTokens = dto.maxTokens ?? 512;

    const startedAt = Date.now();
    const llmResult = await this.llmService.execute({
      provider,
      apiKey,
      model: dto.model,
      prompt: finalPrompt,
      temperature,
      maxTokens,
    });
    const latencyMs = Date.now() - startedAt;
    const totalTokens = llmResult.inputTokens + llmResult.outputTokens;
    const estimatedCost = this.calculateEstimatedCost(
      dto.model,
      llmResult.inputTokens,
      llmResult.outputTokens,
    );

    const latestVersion = prompt.versions[0];
    if (!latestVersion) {
      throw new NotFoundException('Nenhuma versão encontrada para este prompt');
    }

    const execution = await this.prisma.execution.create({
      data: {
        input: finalPrompt,
        output: llmResult.output,
        model: dto.model,
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
      select: { id: true, userId: true, deletedAt: true },
    });

    if (!prompt || prompt.deletedAt) {
      throw new NotFoundException('Prompt não encontrado');
    }
    if (prompt.userId !== userId) {
      throw new ForbiddenException('Sem permissão para este prompt');
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

  private resolveProvider(model: string): 'openai' | 'anthropic' {
    const normalized = model.toLowerCase();
    if (normalized.includes('claude')) {
      return 'anthropic';
    }
    return 'openai';
  }

  private resolveApiKey(
    provider: 'openai' | 'anthropic',
    user: { openaiApiKeyEnc: string | null; anthropicApiKeyEnc: string | null },
  ): string {
    const encryptionSecret = getEnvSecret(
      this.configService,
      'ENCRYPTION_SECRET',
      'dev-encryption-secret',
    );

    if (provider === 'openai') {
      if (!user.openaiApiKeyEnc) {
        throw new BadRequestException(
          'API key da OpenAI não configurada para este usuário',
        );
      }
      return decryptText(user.openaiApiKeyEnc, encryptionSecret);
    }

    if (!user.anthropicApiKeyEnc) {
      throw new BadRequestException(
        'API key da Anthropic não configurada para este usuário',
      );
    }
    return decryptText(user.anthropicApiKeyEnc, encryptionSecret);
  }

  private calculateEstimatedCost(
    model: string,
    inputTokens: number,
    outputTokens: number,
  ): number {
    const pricingPer1k = this.getModelPricing(model);
    const inputCost = (inputTokens / 1000) * pricingPer1k.input;
    const outputCost = (outputTokens / 1000) * pricingPer1k.output;
    return Number((inputCost + outputCost).toFixed(6));
  }

  private getModelPricing(model: string): { input: number; output: number } {
    const normalized = model.toLowerCase();

    if (normalized.includes('gpt-4o-mini')) {
      return { input: 0.00015, output: 0.0006 };
    }
    if (normalized.includes('gpt-4o')) {
      return { input: 0.005, output: 0.015 };
    }
    if (normalized.includes('claude-3-5-sonnet')) {
      return { input: 0.003, output: 0.015 };
    }
    if (normalized.includes('claude-3-haiku')) {
      return { input: 0.00025, output: 0.00125 };
    }

    return { input: 0.001, output: 0.002 };
  }
}

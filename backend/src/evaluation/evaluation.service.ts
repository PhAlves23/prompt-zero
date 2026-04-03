import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmService } from '../executions/llm.service';
import { ProviderType } from '@prisma/client';
import { CreateCriteriaDto } from './dto/create-criteria.dto';
import { JudgeExecutionDto } from './dto/judge-execution.dto';
import { decryptText } from '../common/utils/crypto.util';
import { getEnvSecret } from '../common/utils/env.util';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EvaluationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llmService: LlmService,
    private readonly configService: ConfigService,
  ) {}

  createCriteria(userId: string, dto: CreateCriteriaDto) {
    return this.prisma.evaluationCriteria.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        prompt: dto.prompt,
        scoreMin: dto.scoreMin ?? 1,
        scoreMax: dto.scoreMax ?? 10,
      },
    });
  }

  listCriteria(userId: string) {
    return this.prisma.evaluationCriteria.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async judge(userId: string, dto: JudgeExecutionDto) {
    const execution = await this.prisma.execution.findFirst({
      where: { id: dto.executionId, userId },
    });
    if (!execution) {
      throw new NotFoundException('errors.executionNotFound');
    }
    const criteria = await this.prisma.evaluationCriteria.findFirst({
      where: { id: dto.criteriaId, userId },
    });
    if (!criteria) {
      throw new NotFoundException('errors.criteriaNotFound');
    }

    const judgeModel = dto.judgeModel ?? 'gpt-4o-mini';
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('errors.userNotFound');
    }
    const credential = await this.prisma.providerCredential.findFirst({
      where: { userId, provider: ProviderType.openai, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
    const enc = getEnvSecret(
      this.configService,
      'ENCRYPTION_SECRET',
      'dev-encryption-secret',
    );
    const apiKey = credential?.apiKeyEnc
      ? decryptText(credential.apiKeyEnc, enc)
      : user.openaiApiKeyEnc
        ? decryptText(user.openaiApiKeyEnc, enc)
        : null;
    if (!apiKey) {
      throw new BadRequestException('errors.openaiApiKeyNotConfigured');
    }

    const judgeUserPrompt = criteria.prompt.replace(
      /\{\{\s*output\s*\}\}/g,
      execution.output,
    );
    const system = `You are an evaluator. Respond ONLY with compact JSON: {"score": number between ${criteria.scoreMin} and ${criteria.scoreMax}, "reasoning": "short text"}`;

    const result = await this.llmService.execute({
      provider: ProviderType.openai,
      apiKey,
      model: judgeModel,
      prompt: `${system}\n\nText to evaluate:\n${judgeUserPrompt}`,
      temperature: 0.2,
      maxTokens: 512,
      topP: 0.95,
      topK: 40,
      baseUrl: credential?.baseUrl,
      organizationId: credential?.organizationId,
    });

    let score = 0;
    let reasoning: string | null = null;
    try {
      const parsed = JSON.parse(result.output) as {
        score?: number;
        reasoning?: string;
      };
      score = Number(parsed.score);
      reasoning = parsed.reasoning ?? null;
    } catch {
      throw new BadRequestException('errors.judgeResponseInvalid');
    }
    if (
      Number.isNaN(score) ||
      score < criteria.scoreMin ||
      score > criteria.scoreMax
    ) {
      throw new BadRequestException('errors.judgeScoreOutOfRange');
    }

    return this.prisma.executionEvaluation.create({
      data: {
        executionId: execution.id,
        criteriaId: criteria.id,
        score,
        reasoning,
        judgeModel,
      },
    });
  }

  listEvaluationsForExecution(userId: string, executionId: string) {
    return this.prisma.executionEvaluation.findMany({
      where: {
        executionId,
        execution: { userId },
      },
      include: { criteria: true },
    });
  }
}

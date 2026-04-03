import { Injectable } from '@nestjs/common';
import { ExecutionsService } from '../executions/executions.service';
import { ComparePromptDto } from './dto/compare-prompt.dto';

@Injectable()
export class PlaygroundService {
  constructor(private readonly executionsService: ExecutionsService) {}

  async compare(userId: string, dto: ComparePromptDto) {
    const results = await Promise.all(
      dto.variants.map(async (v) => {
        try {
          const out = await this.executionsService.executePrompt(
            userId,
            dto.promptId,
            {
              model: v.model,
              provider: v.provider,
              temperature: v.temperature,
              maxTokens: v.maxTokens,
            },
          );
          return {
            model: v.model,
            provider: v.provider,
            ok: true as const,
            output: out.output,
            meta: out.meta,
            executionId: out.execution.id,
          };
        } catch (e: unknown) {
          return {
            model: v.model,
            provider: v.provider,
            ok: false as const,
            error: e instanceof Error ? e.message : 'error',
          };
        }
      }),
    );
    return { results };
  }
}

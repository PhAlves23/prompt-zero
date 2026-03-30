import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export interface LlmExecutionResult {
  output: string;
  inputTokens: number;
  outputTokens: number;
}

@Injectable()
export class LlmService {
  async execute(params: {
    provider: 'openai' | 'anthropic';
    apiKey: string;
    model: string;
    prompt: string;
    temperature: number;
    maxTokens: number;
  }): Promise<LlmExecutionResult> {
    if (params.provider === 'openai') {
      return this.executeOpenAi(params);
    }
    return this.executeAnthropic(params);
  }

  private async executeOpenAi(params: {
    apiKey: string;
    model: string;
    prompt: string;
    temperature: number;
    maxTokens: number;
  }): Promise<LlmExecutionResult> {
    try {
      const client = new OpenAI({ apiKey: params.apiKey });
      const completion = await client.chat.completions.create({
        model: params.model,
        messages: [{ role: 'user', content: params.prompt }],
        temperature: params.temperature,
        max_tokens: params.maxTokens,
      });

      const output = completion.choices[0]?.message?.content ?? '';
      const inputTokens =
        completion.usage?.prompt_tokens ?? this.estimateTokens(params.prompt);
      const outputTokens =
        completion.usage?.completion_tokens ?? this.estimateTokens(output);

      return { output, inputTokens, outputTokens };
    } catch {
      throw new ServiceUnavailableException(
        'Falha ao executar prompt no provedor OpenAI',
      );
    }
  }

  private async executeAnthropic(params: {
    apiKey: string;
    model: string;
    prompt: string;
    temperature: number;
    maxTokens: number;
  }): Promise<LlmExecutionResult> {
    try {
      const client = new Anthropic({ apiKey: params.apiKey });
      const response = await client.messages.create({
        model: params.model,
        max_tokens: params.maxTokens,
        temperature: params.temperature,
        messages: [{ role: 'user', content: params.prompt }],
      });

      const output = response.content
        .map((item) => ('text' in item ? item.text : ''))
        .join('');
      const inputTokens =
        response.usage?.input_tokens ?? this.estimateTokens(params.prompt);
      const outputTokens =
        response.usage?.output_tokens ?? this.estimateTokens(output);

      return { output, inputTokens, outputTokens };
    } catch {
      throw new ServiceUnavailableException(
        'Falha ao executar prompt no provedor Anthropic',
      );
    }
  }

  private estimateTokens(text: string): number {
    return Math.max(1, Math.ceil(text.length / 4));
  }
}

import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { ProviderType } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

export interface LlmExecutionResult {
  output: string;
  inputTokens: number;
  outputTokens: number;
}

@Injectable()
export class LlmService {
  private readonly circuitState = new Map<
    ProviderType,
    { failures: number; openedUntil: number | null }
  >();

  constructor(private readonly configService: ConfigService) {}

  async execute(params: {
    provider: ProviderType;
    apiKey: string;
    model: string;
    prompt: string;
    temperature: number;
    maxTokens: number;
    baseUrl?: string | null;
    organizationId?: string | null;
  }): Promise<LlmExecutionResult> {
    this.assertCircuitClosed(params.provider);

    if (params.provider === ProviderType.openai) {
      return this.executeWithResilience(params.provider, () =>
        this.executeOpenAi({
          ...params,
          baseUrl: undefined,
        }),
      );
    }

    if (params.provider === ProviderType.openrouter) {
      return this.executeWithResilience(params.provider, () =>
        this.executeOpenAi({
          ...params,
          model: this.normalizeOpenRouterModel(params.model),
          baseUrl: params.baseUrl ?? 'https://openrouter.ai/api/v1',
        }),
      );
    }

    if (params.provider === ProviderType.anthropic) {
      return this.executeWithResilience(params.provider, () =>
        this.executeAnthropic(params),
      );
    }

    if (params.provider === ProviderType.google) {
      return this.executeWithResilience(params.provider, () =>
        this.executeGoogle(params),
      );
    }

    throw new ServiceUnavailableException('errors.providerNotSupported');
  }

  private async executeWithResilience(
    provider: ProviderType,
    fn: () => Promise<LlmExecutionResult>,
  ): Promise<LlmExecutionResult> {
    const maxRetries = this.configService.get<number>('LLM_MAX_RETRIES', 2);
    const backoffBaseMs = this.configService.get<number>('LLM_BACKOFF_MS', 300);
    const timeoutMs = this.configService.get<number>('LLM_TIMEOUT_MS', 30000);

    let attempt = 0;
    let lastError: unknown;

    while (attempt <= maxRetries) {
      try {
        const result = await this.withTimeout(fn(), timeoutMs);
        this.registerSuccess(provider);
        return result;
      } catch (error) {
        lastError = error;
        this.registerFailure(provider);
        if (attempt >= maxRetries || !this.isRetryableError(error)) {
          break;
        }
        await this.sleep(backoffBaseMs * 2 ** attempt);
      }
      attempt += 1;
    }

    const state = this.circuitState.get(provider);
    if (state?.openedUntil && state.openedUntil > Date.now()) {
      throw new ServiceUnavailableException(
        'errors.providerTemporarilyUnavailable',
      );
    }

    if (lastError instanceof ServiceUnavailableException) {
      throw lastError;
    }

    throw new ServiceUnavailableException('errors.providerExecutionFailed');
  }

  private assertCircuitClosed(provider: ProviderType): void {
    const state = this.circuitState.get(provider);
    if (!state?.openedUntil) {
      return;
    }
    if (Date.now() >= state.openedUntil) {
      this.circuitState.set(provider, { failures: 0, openedUntil: null });
      return;
    }
    throw new ServiceUnavailableException(
      'errors.providerTemporarilyUnavailable',
    );
  }

  private registerSuccess(provider: ProviderType): void {
    this.circuitState.set(provider, { failures: 0, openedUntil: null });
  }

  private registerFailure(provider: ProviderType): void {
    const maxFailuresBeforeOpen = this.configService.get<number>(
      'LLM_CIRCUIT_FAILURE_THRESHOLD',
      3,
    );
    const cooldownMs = this.configService.get<number>(
      'LLM_CIRCUIT_COOLDOWN_MS',
      30000,
    );

    const current = this.circuitState.get(provider) ?? {
      failures: 0,
      openedUntil: null,
    };
    const failures = current.failures + 1;
    if (failures >= maxFailuresBeforeOpen) {
      this.circuitState.set(provider, {
        failures,
        openedUntil: Date.now() + cooldownMs,
      });
      return;
    }
    this.circuitState.set(provider, { failures, openedUntil: null });
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof ServiceUnavailableException) {
      return true;
    }
    if (error instanceof Error) {
      return !error.message.toLowerCase().includes('authentication');
    }
    return false;
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new ServiceUnavailableException('errors.providerTimeout'));
      }, timeoutMs);

      void promise
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((error: unknown) => {
          clearTimeout(timer);
          reject(error instanceof Error ? error : new Error(String(error)));
        });
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private async executeOpenAi(params: {
    apiKey: string;
    model: string;
    prompt: string;
    temperature: number;
    maxTokens: number;
    baseUrl?: string | null;
    organizationId?: string | null;
  }): Promise<LlmExecutionResult> {
    try {
      const client = new OpenAI({
        apiKey: params.apiKey,
        baseURL: params.baseUrl ?? undefined,
        organization: params.organizationId ?? undefined,
      });
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
      throw new ServiceUnavailableException('errors.openaiExecutionFailed');
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
      throw new ServiceUnavailableException('errors.anthropicExecutionFailed');
    }
  }

  private async executeGoogle(params: {
    apiKey: string;
    model: string;
    prompt: string;
    temperature: number;
    maxTokens: number;
  }): Promise<LlmExecutionResult> {
    try {
      const endpoint =
        `https://generativelanguage.googleapis.com/v1beta/models/` +
        `${encodeURIComponent(params.model)}:generateContent`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': params.apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: params.prompt }] }],
          generationConfig: {
            temperature: params.temperature,
            maxOutputTokens: params.maxTokens,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Google LLM request failed');
      }

      const payload: unknown = await response.json();
      return this.parseGoogleResponse(payload, params.prompt);
    } catch {
      throw new ServiceUnavailableException('errors.googleExecutionFailed');
    }
  }

  private parseGoogleResponse(
    payload: unknown,
    promptText: string,
  ): LlmExecutionResult {
    const data = payload as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
      };
    };

    const output =
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? '')
        .join('') ?? '';
    const inputTokens =
      data.usageMetadata?.promptTokenCount ?? this.estimateTokens(promptText);
    const outputTokens =
      data.usageMetadata?.candidatesTokenCount ?? this.estimateTokens(output);

    return { output, inputTokens, outputTokens };
  }

  private normalizeOpenRouterModel(model: string): string {
    const normalized = model.trim();
    if (normalized.toLowerCase().startsWith('openrouter/')) {
      return normalized.slice('openrouter/'.length);
    }
    return normalized;
  }

  private estimateTokens(text: string): number {
    return Math.max(1, Math.ceil(text.length / 4));
  }
}

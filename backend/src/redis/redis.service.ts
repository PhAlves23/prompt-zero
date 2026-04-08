import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProviderType } from '@prisma/client';
import Redis from 'ioredis';

export type CachedLlmExecution = {
  output: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  cachedAt: number;
  provider: ProviderType;
  model: string;
};

type ExperimentVoteCounters = {
  A: number;
  B: number;
  total: number;
};

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis | null;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      this.client = null;
      this.logger.warn(
        'REDIS_URL não configurada. Cache de experimentos A/B e de execuções LLM ficarão desabilitados.',
      );
      return;
    }

    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  isEnabled() {
    return this.client !== null;
  }

  async getCachedExecution(
    redisKey: string,
  ): Promise<CachedLlmExecution | null> {
    if (!this.client) {
      return null;
    }

    try {
      const cached = await this.client.get(redisKey);
      if (!cached) {
        return null;
      }
      return JSON.parse(cached) as CachedLlmExecution;
    } catch (error) {
      this.logger.warn(`Falha ao ler cache de execução: ${redisKey}`);
      this.logger.debug(String(error));
      return null;
    }
  }

  async setCachedExecution(
    redisKey: string,
    value: CachedLlmExecution,
    ttlSeconds: number,
  ): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      await this.client.setex(redisKey, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      this.logger.warn(`Falha ao armazenar cache de execução: ${redisKey}`);
      this.logger.debug(String(error));
    }
  }

  /**
   * Remove chaves que correspondem ao padrão (ex.: cache:exec:*:ws:uuid:*).
   * Usa SCAN para evitar bloquear o Redis.
   */
  async invalidateCacheByPattern(pattern: string): Promise<number> {
    if (!this.client) {
      return 0;
    }

    let cursor = '0';
    let deleted = 0;
    try {
      do {
        const [nextCursor, keys] = await this.client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          '100',
        );
        cursor = nextCursor;
        if (keys.length > 0) {
          deleted += await this.client.del(...keys);
        }
      } while (cursor !== '0');
      return deleted;
    } catch (error) {
      this.logger.warn(`Falha ao invalidar cache com padrão: ${pattern}`);
      this.logger.debug(String(error));
      return deleted;
    }
  }

  async incrementVoteCounters(
    experimentId: string,
    variant: 'A' | 'B',
  ): Promise<void> {
    if (!this.client) {
      return;
    }

    const key = this.getVotesKey(experimentId);
    try {
      await this.client
        .multi()
        .hincrby(key, variant, 1)
        .hincrby(key, 'total', 1)
        .exec();
    } catch (error) {
      this.logger.warn(
        `Falha ao incrementar contador Redis para experimento ${experimentId}`,
      );
      this.logger.debug(String(error));
    }
  }

  async getVoteCounters(
    experimentId: string,
  ): Promise<ExperimentVoteCounters | null> {
    if (!this.client) {
      return null;
    }

    try {
      const data = await this.client.hgetall(this.getVotesKey(experimentId));
      if (!data || Object.keys(data).length === 0) {
        return null;
      }

      return {
        A: Number(data.A ?? 0),
        B: Number(data.B ?? 0),
        total: Number(data.total ?? 0),
      };
    } catch (error) {
      this.logger.warn(
        `Falha ao ler contadores Redis para experimento ${experimentId}`,
      );
      this.logger.debug(String(error));
      return null;
    }
  }

  async setVoteCounters(
    experimentId: string,
    counters: ExperimentVoteCounters,
  ): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      await this.client.hset(this.getVotesKey(experimentId), {
        A: String(counters.A),
        B: String(counters.B),
        total: String(counters.total),
      });
    } catch (error) {
      this.logger.warn(
        `Falha ao preencher cache Redis para experimento ${experimentId}`,
      );
      this.logger.debug(String(error));
    }
  }

  private getVotesKey(experimentId: string) {
    return `ab:exp:${experimentId}:votes`;
  }
}

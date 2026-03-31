import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

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
        'REDIS_URL não configurada. Cache de experimentos A/B ficará desabilitado.',
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

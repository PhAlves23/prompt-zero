import { Module } from '@nestjs/common';
import { ExecutionsService } from './executions.service';
import { ExecutionsController } from './executions.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { BillingModule } from '../billing/billing.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { LlmService } from './llm.service';
import { ProviderPricingService } from './provider-pricing.service';
import {
  makeCounterProvider,
  makeHistogramProvider,
} from '@willsoto/nestjs-prometheus';
import { MetricsModule } from '../metrics/metrics.module';
import {
  LLM_EXECUTION_DURATION_METRIC,
  LLM_EXECUTIONS_TOTAL_METRIC,
  LLM_TOKENS_TOTAL_METRIC,
} from '../metrics/metrics.constants';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    MetricsModule,
    BillingModule,
    WorkspacesModule,
    WebhooksModule,
  ],
  providers: [
    ExecutionsService,
    LlmService,
    ProviderPricingService,
    makeCounterProvider({
      name: LLM_EXECUTIONS_TOTAL_METRIC,
      help: 'Total number of LLM executions',
      labelNames: ['provider', 'model', 'status'],
    }),
    makeHistogramProvider({
      name: LLM_EXECUTION_DURATION_METRIC,
      help: 'Duration of LLM executions in seconds',
      labelNames: ['provider', 'model', 'status'],
      buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 30, 60],
    }),
    makeCounterProvider({
      name: LLM_TOKENS_TOTAL_METRIC,
      help: 'Total number of processed LLM tokens',
      labelNames: ['provider', 'model', 'type'],
    }),
  ],
  controllers: [ExecutionsController],
  exports: [ExecutionsService, LlmService],
})
export class ExecutionsModule {}

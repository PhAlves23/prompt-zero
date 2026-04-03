import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PromptsModule } from './prompts/prompts.module';
import { TagsModule } from './tags/tags.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { SettingsModule } from './settings/settings.module';
import { ExecutionsModule } from './executions/executions.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ExploreModule } from './explore/explore.module';
import { MetricsModule } from './metrics/metrics.module';
import { ExperimentsModule } from './experiments/experiments.module';
import { BillingModule } from './billing/billing.module';
import { DatasetsModule } from './datasets/datasets.module';
import { EvaluationModule } from './evaluation/evaluation.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { PlatformApiModule } from './platform-api/platform-api.module';
import { TracesModule } from './traces/traces.module';
import { PlaygroundModule } from './playground/playground.module';
import { CommentsModule } from './comments/comments.module';
import { AuditModule } from './audit/audit.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nJsonLoader,
  I18nModule,
  QueryResolver,
} from 'nestjs-i18n';
import { join } from 'path';
import { AppThrottlerGuard } from './common/guards/app-throttler.guard';
import { ObservabilityModule } from './observability/observability.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    ObservabilityModule,
    AuthModule,
    UsersModule,
    PromptsModule,
    TagsModule,
    WorkspacesModule,
    SettingsModule,
    ExecutionsModule,
    AnalyticsModule,
    ExploreModule,
    MetricsModule,
    ExperimentsModule,
    BillingModule,
    DatasetsModule,
    EvaluationModule,
    WebhooksModule,
    PlatformApiModule,
    TracesModule,
    PlaygroundModule,
    CommentsModule,
    AuditModule,
    I18nModule.forRoot({
      fallbackLanguage: 'pt',
      fallbacks: {
        'pt-BR': 'pt',
        'pt-*': 'pt',
        'en-US': 'en',
        'en-*': 'en',
        'es-ES': 'es',
        'es-*': 'es',
      },
      loader: I18nJsonLoader,
      loaderOptions: {
        path: join(__dirname, 'i18n'),
        watch: true,
      },
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        new HeaderResolver(['x-lang']),
        AcceptLanguageResolver,
      ],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 60,
      },
    ]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
  ],
})
export class AppModule {}

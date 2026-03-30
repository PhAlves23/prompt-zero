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
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    PromptsModule,
    TagsModule,
    WorkspacesModule,
    SettingsModule,
    ExecutionsModule,
    AnalyticsModule,
    ExploreModule,
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
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

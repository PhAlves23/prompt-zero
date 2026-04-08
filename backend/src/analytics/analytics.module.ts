import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { CacheAnalyticsService } from './cache-analytics.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [AnalyticsService, CacheAnalyticsService],
  controllers: [AnalyticsController],
  exports: [AnalyticsService, CacheAnalyticsService],
})
export class AnalyticsModule {}

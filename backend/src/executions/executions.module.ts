import { Module } from '@nestjs/common';
import { ExecutionsService } from './executions.service';
import { ExecutionsController } from './executions.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { LlmService } from './llm.service';
import { ProviderPricingService } from './provider-pricing.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  providers: [ExecutionsService, LlmService, ProviderPricingService],
  controllers: [ExecutionsController],
  exports: [ExecutionsService],
})
export class ExecutionsModule {}

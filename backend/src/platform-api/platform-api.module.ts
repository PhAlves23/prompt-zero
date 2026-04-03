import { Module } from '@nestjs/common';
import { PlatformApiKeysService } from './platform-api-keys.service';
import { PlatformApiKeysController } from './platform-api-keys.controller';
import { PlatformPublicController } from './platform-public.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ExecutionsModule } from '../executions/executions.module';
import { ApiKeyAuthGuard } from './api-key-auth.guard';

@Module({
  imports: [PrismaModule, ExecutionsModule],
  controllers: [PlatformApiKeysController, PlatformPublicController],
  providers: [PlatformApiKeysService, ApiKeyAuthGuard],
  exports: [PlatformApiKeysService, ApiKeyAuthGuard],
})
export class PlatformApiModule {}

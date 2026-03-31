import { Module } from '@nestjs/common';
import { ExperimentsService } from './experiments.service';
import { ExperimentsController } from './experiments.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ExecutionsModule } from '../executions/executions.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [PrismaModule, ExecutionsModule, RedisModule],
  controllers: [ExperimentsController],
  providers: [ExperimentsService],
})
export class ExperimentsModule {}

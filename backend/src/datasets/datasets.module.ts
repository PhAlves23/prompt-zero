import { Module } from '@nestjs/common';
import { DatasetsService } from './datasets.service';
import { DatasetsController } from './datasets.controller';
import { DatasetRunExecutorService } from './dataset-run-executor.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ExecutionsModule } from '../executions/executions.module';
import { EvaluationModule } from '../evaluation/evaluation.module';

@Module({
  imports: [PrismaModule, ExecutionsModule, EvaluationModule],
  controllers: [DatasetsController],
  providers: [DatasetsService, DatasetRunExecutorService],
  exports: [DatasetsService],
})
export class DatasetsModule {}

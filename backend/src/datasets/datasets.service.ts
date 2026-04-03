import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDatasetDto } from './dto/create-dataset.dto';
import { UpdateDatasetDto } from './dto/update-dataset.dto';
import { DatasetRunExecutorService } from './dataset-run-executor.service';
import { DatasetRunStatus } from '@prisma/client';
import { WebhooksService } from '../webhooks/webhooks.service';

@Injectable()
export class DatasetsService {
  private readonly logger = new Logger(DatasetsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly datasetRunExecutor: DatasetRunExecutorService,
    private readonly webhooksService: WebhooksService,
  ) {}

  async create(userId: string, dto: CreateDatasetDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      const dataset = await tx.dataset.create({
        data: {
          userId,
          name: dto.name,
          description: dto.description,
          rowCount: dto.rows.length,
          schema: {},
        },
      });
      if (dto.rows.length > 0) {
        await tx.datasetRow.createMany({
          data: dto.rows.map((row, index) => ({
            datasetId: dataset.id,
            rowIndex: index,
            variables: row.variables as object,
            expectedOutput: row.expectedOutput ?? null,
          })),
        });
      }
      return tx.dataset.findUniqueOrThrow({
        where: { id: dataset.id },
        include: { rows: { orderBy: { rowIndex: 'asc' } } },
      });
    });
    void this.webhooksService.emit(userId, 'dataset.created', {
      datasetId: result.id,
    });
    return result;
  }

  list(userId: string) {
    return this.prisma.dataset.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { rows: true, runs: true } } },
    });
  }

  async getOne(userId: string, id: string) {
    const dataset = await this.prisma.dataset.findFirst({
      where: { id, userId },
      include: { rows: { orderBy: { rowIndex: 'asc' } } },
    });
    if (!dataset) {
      throw new NotFoundException('errors.datasetNotFound');
    }
    return dataset;
  }

  async update(userId: string, id: string, dto: UpdateDatasetDto) {
    await this.getOne(userId, id);
    if (
      dto.name === undefined &&
      dto.description === undefined &&
      dto.rows === undefined
    ) {
      return this.getOne(userId, id);
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const data: {
        name?: string;
        description?: string | null;
        rowCount?: number;
      } = {};
      if (dto.name !== undefined) {
        data.name = dto.name;
      }
      if (dto.description !== undefined) {
        data.description = dto.description;
      }

      if (Object.keys(data).length > 0) {
        await tx.dataset.update({ where: { id }, data });
      }

      if (dto.rows !== undefined) {
        await tx.datasetRow.deleteMany({ where: { datasetId: id } });
        if (dto.rows.length > 0) {
          await tx.datasetRow.createMany({
            data: dto.rows.map((row, index) => ({
              datasetId: id,
              rowIndex: index,
              variables: row.variables as object,
              expectedOutput: row.expectedOutput ?? null,
            })),
          });
        }
        await tx.dataset.update({
          where: { id },
          data: { rowCount: dto.rows.length },
        });
      }

      return tx.dataset.findUniqueOrThrow({
        where: { id },
        include: { rows: { orderBy: { rowIndex: 'asc' } } },
      });
    });
    void this.webhooksService.emit(userId, 'dataset.updated', {
      datasetId: id,
    });
    return updated;
  }

  async remove(userId: string, id: string) {
    const dataset = await this.prisma.dataset.findFirst({
      where: { id, userId },
    });
    if (!dataset) {
      throw new NotFoundException('errors.datasetNotFound');
    }
    await this.prisma.dataset.delete({ where: { id } });
    void this.webhooksService.emit(userId, 'dataset.deleted', {
      datasetId: id,
    });
  }

  async listRuns(userId: string, datasetId: string) {
    await this.getOne(userId, datasetId);
    return this.prisma.datasetRun.findMany({
      where: { datasetId },
      orderBy: { createdAt: 'desc' },
      include: {
        prompt: { select: { id: true, title: true } },
      },
    });
  }

  /**
   * Creates a pending run and processes it asynchronously (non-blocking HTTP).
   */
  async startRun(
    userId: string,
    datasetId: string,
    promptId: string,
    options?: { credentialId?: string; criteriaId?: string },
  ) {
    await this.getOne(userId, datasetId);
    const promptMeta = await this.prisma.prompt.findFirst({
      where: { id: promptId, userId, deletedAt: null },
    });
    if (!promptMeta) {
      throw new NotFoundException('errors.promptNotFound');
    }

    const run = await this.prisma.datasetRun.create({
      data: {
        datasetId,
        promptId,
        status: DatasetRunStatus.pending,
      },
    });

    void this.webhooksService.emit(userId, 'dataset.run.created', {
      runId: run.id,
      datasetId,
      promptId,
    });

    // In-process async (non-blocking HTTP). For multi-instance deployments, replace with a queue (e.g. BullMQ).
    setImmediate(() => {
      void this.datasetRunExecutor
        .execute(run.id, userId, options)
        .catch((err: unknown) => {
          this.logger.error(
            'Dataset run executor error',
            err instanceof Error ? err.stack : err,
          );
        });
    });

    return run;
  }

  async getRunResults(userId: string, datasetId: string, runId: string) {
    await this.getOne(userId, datasetId);
    const run = await this.prisma.datasetRun.findFirst({
      where: { id: runId, datasetId },
      include: {
        executions: { orderBy: { createdAt: 'asc' } },
        prompt: { select: { id: true, title: true } },
      },
    });
    if (!run) {
      throw new NotFoundException('errors.datasetRunNotFound');
    }
    return run;
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDatasetDto } from './dto/create-dataset.dto';
import { ExecutionsService } from '../executions/executions.service';
import { DatasetRunStatus } from '@prisma/client';

@Injectable()
export class DatasetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly executionsService: ExecutionsService,
  ) {}

  async create(userId: string, dto: CreateDatasetDto) {
    return this.prisma.$transaction(async (tx) => {
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
          })),
        });
      }
      return tx.dataset.findUniqueOrThrow({
        where: { id: dataset.id },
        include: { rows: { orderBy: { rowIndex: 'asc' } } },
      });
    });
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

  async run(userId: string, datasetId: string, promptId: string) {
    const dataset = await this.getOne(userId, datasetId);
    const run = await this.prisma.datasetRun.create({
      data: {
        datasetId,
        promptId,
        status: DatasetRunStatus.running,
      },
    });

    const promptMeta = await this.prisma.prompt.findFirst({
      where: { id: promptId, deletedAt: null },
    });
    if (!promptMeta) {
      throw new NotFoundException('errors.promptNotFound');
    }

    const results: Array<{
      rowIndex: number;
      executionId: string;
      ok: boolean;
    }> = [];
    try {
      for (const row of dataset.rows) {
        const vars = row.variables as Record<string, string>;
        try {
          const exec = await this.executionsService.executePrompt(
            userId,
            promptId,
            {
              model: promptMeta.model,
              variables: vars,
            },
          );
          await this.prisma.execution.update({
            where: { id: exec.execution.id },
            data: { datasetRunId: run.id },
          });
          results.push({
            rowIndex: row.rowIndex,
            executionId: exec.execution.id,
            ok: true,
          });
        } catch {
          results.push({ rowIndex: row.rowIndex, executionId: '', ok: false });
        }
      }
      const summary = {
        total: results.length,
        success: results.filter((r) => r.ok).length,
        results,
      };
      await this.prisma.datasetRun.update({
        where: { id: run.id },
        data: {
          status: DatasetRunStatus.completed,
          completedAt: new Date(),
          results: summary as object,
        },
      });
      return this.prisma.datasetRun.findUniqueOrThrow({
        where: { id: run.id },
        include: { executions: true },
      });
    } catch (e) {
      await this.prisma.datasetRun.update({
        where: { id: run.id },
        data: { status: DatasetRunStatus.failed, completedAt: new Date() },
      });
      throw e;
    }
  }

  async getRunResults(userId: string, datasetId: string, runId: string) {
    await this.getOne(userId, datasetId);
    const run = await this.prisma.datasetRun.findFirst({
      where: { id: runId, datasetId },
      include: { executions: { orderBy: { createdAt: 'asc' } } },
    });
    if (!run) {
      throw new NotFoundException('errors.datasetRunNotFound');
    }
    return run;
  }
}

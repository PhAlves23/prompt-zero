import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExecutionsService } from '../executions/executions.service';
import { EvaluationService } from '../evaluation/evaluation.service';
import { DatasetRunStatus } from '@prisma/client';

type RowResult = {
  rowIndex: number;
  executionId: string;
  ok: boolean;
  expectedMatch: boolean | null;
  judgeScore?: number | null;
  judgeError?: boolean;
};

function compareExpected(
  output: string | null,
  expected: string | null | undefined,
): boolean | null {
  if (expected == null || expected === '') {
    return null;
  }
  if (output == null) {
    return false;
  }
  return output.trim() === expected.trim();
}

@Injectable()
export class DatasetRunExecutorService {
  private readonly logger = new Logger(DatasetRunExecutorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly executionsService: ExecutionsService,
    private readonly evaluationService: EvaluationService,
  ) {}

  /**
   * Processes a dataset run that was created with status `pending`.
   * Sets `running`, executes each row, then `completed` or `failed`.
   */
  async execute(
    runId: string,
    userId: string,
    options?: { credentialId?: string; criteriaId?: string },
  ): Promise<void> {
    const run = await this.prisma.datasetRun.findUnique({
      where: { id: runId },
      include: {
        dataset: {
          include: { rows: { orderBy: { rowIndex: 'asc' } } },
        },
      },
    });

    if (!run) {
      this.logger.warn(`DatasetRun ${runId} not found`);
      return;
    }

    if (run.dataset.userId !== userId) {
      this.logger.warn(`DatasetRun ${runId} user mismatch`);
      await this.markFailed(runId);
      return;
    }

    const promptMeta = await this.prisma.prompt.findFirst({
      where: { id: run.promptId, userId, deletedAt: null },
    });
    if (!promptMeta) {
      await this.markFailed(runId);
      return;
    }

    await this.prisma.datasetRun.update({
      where: { id: runId },
      data: { status: DatasetRunStatus.running },
    });

    const results: RowResult[] = [];
    const criteriaId = options?.criteriaId;
    const credentialId = options?.credentialId;

    try {
      for (const row of run.dataset.rows) {
        const vars = row.variables as Record<string, string>;
        let judgeScore: number | null | undefined;
        let judgeError = false;
        try {
          const exec = await this.executionsService.executePrompt(
            userId,
            run.promptId,
            {
              model: promptMeta.model,
              variables: vars,
              ...(credentialId ? { credentialId } : {}),
            },
          );
          await this.prisma.execution.update({
            where: { id: exec.execution.id },
            data: { datasetRunId: run.id },
          });

          const expectedMatch = compareExpected(
            exec.execution.output,
            row.expectedOutput,
          );

          if (criteriaId && exec.execution.id) {
            try {
              const evaluation = await this.evaluationService.judge(userId, {
                executionId: exec.execution.id,
                criteriaId,
                judgeModel: 'gpt-4o-mini',
              });
              judgeScore = evaluation.score;
            } catch (e) {
              judgeError = true;
              this.logger.warn(
                `Judge failed for execution ${exec.execution.id}: ${e instanceof Error ? e.message : e}`,
              );
            }
          }

          results.push({
            rowIndex: row.rowIndex,
            executionId: exec.execution.id,
            ok: true,
            expectedMatch,
            judgeScore: judgeScore ?? null,
            judgeError: judgeError || undefined,
          });
        } catch {
          results.push({
            rowIndex: row.rowIndex,
            executionId: '',
            ok: false,
            expectedMatch:
              row.expectedOutput != null && row.expectedOutput !== ''
                ? false
                : null,
          });
        }
      }

      const judgeScores = results
        .map((r) => r.judgeScore)
        .filter((s): s is number => typeof s === 'number' && !Number.isNaN(s));
      const expectedCompared = results.filter(
        (r) => r.expectedMatch !== null,
      ).length;
      const expectedMatches = results.filter(
        (r) => r.expectedMatch === true,
      ).length;

      const summary = {
        total: results.length,
        success: results.filter((r) => r.ok).length,
        failed: results.filter((r) => !r.ok).length,
        expectedCompared,
        expectedMatches,
        averageJudgeScore:
          judgeScores.length > 0
            ? judgeScores.reduce((a, b) => a + b, 0) / judgeScores.length
            : null,
        results,
      };

      await this.prisma.datasetRun.update({
        where: { id: runId },
        data: {
          status: DatasetRunStatus.completed,
          completedAt: new Date(),
          results: summary as object,
        },
      });
    } catch (e) {
      this.logger.error(
        `DatasetRun ${runId} failed: ${e instanceof Error ? e.message : e}`,
      );
      await this.markFailed(runId);
    }
  }

  private async markFailed(runId: string): Promise<void> {
    await this.prisma.datasetRun.update({
      where: { id: runId },
      data: {
        status: DatasetRunStatus.failed,
        completedAt: new Date(),
      },
    });
  }
}

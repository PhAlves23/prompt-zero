import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IngestTraceDto } from './dto/ingest-trace.dto';

@Injectable()
export class TracesService {
  constructor(private readonly prisma: PrismaService) {}

  async ingest(userId: string, dto: IngestTraceDto) {
    const run = await this.prisma.traceRun.create({
      data: {
        userId,
        name: dto.name ?? 'langchain',
        source: 'langchain',
      },
    });
    const idMap = new Map<string, string>();
    let pending = [...dto.spans];
    let guard = 0;
    while (pending.length > 0 && guard < dto.spans.length + 5) {
      guard += 1;
      const next: typeof pending = [];
      for (const span of pending) {
        const parentDbId = span.parentId ? idMap.get(span.parentId) : undefined;
        if (span.parentId && parentDbId === undefined) {
          next.push(span);
          continue;
        }
        const created = await this.prisma.traceSpan.create({
          data: {
            traceRunId: run.id,
            parentId: parentDbId ?? null,
            name: span.name,
            startTime: new Date(span.startTime),
            endTime: span.endTime ? new Date(span.endTime) : null,
            attributes: span.attributes as object | undefined,
          },
        });
        if (span.id) {
          idMap.set(span.id, created.id);
        }
      }
      pending = next;
    }
    return this.getOne(userId, run.id);
  }

  list(userId: string) {
    return this.prisma.traceRun.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { _count: { select: { spans: true } } },
    });
  }

  async getOne(userId: string, id: string) {
    const run = await this.prisma.traceRun.findFirst({
      where: { id, userId },
      include: {
        spans: { orderBy: { startTime: 'asc' } },
      },
    });
    if (!run) {
      throw new NotFoundException('errors.traceNotFound');
    }
    return run;
  }
}

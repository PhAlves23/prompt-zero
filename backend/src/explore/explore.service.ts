import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class ExploreService {
  constructor(private readonly prisma: PrismaService) {}

  async listPublicPrompts(query: {
    page: number;
    limit: number;
    search?: string;
    model?: string;
    language?: string;
  }) {
    const where = {
      isPublic: true,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              {
                title: { contains: query.search, mode: 'insensitive' as const },
              },
              {
                description: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
      ...(query.model ? { model: query.model } : {}),
      ...(query.language ? { language: query.language as never } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.prompt.findMany({
        where,
        orderBy: [{ forkCount: 'desc' }, { updatedAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          tags: {
            include: { tag: true },
          },
          versions: {
            orderBy: { versionNumber: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.prompt.count({ where }),
    ]);

    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getPublicPrompt(promptId: string) {
    const prompt = await this.prisma.prompt.findFirst({
      where: {
        id: promptId,
        isPublic: true,
        deletedAt: null,
      },
      include: {
        tags: {
          include: { tag: true },
        },
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
        variables: true,
      },
    });

    if (!prompt) {
      throw new NotFoundException('errors.publicPromptNotFound');
    }
    return prompt;
  }
}

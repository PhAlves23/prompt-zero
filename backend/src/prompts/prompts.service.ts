import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { UpdatePromptDto } from './dto/update-prompt.dto';
import { ListPromptsQueryDto } from './dto/list-prompts-query.dto';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

@Injectable()
export class PromptsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreatePromptDto) {
    const workspaceId = await this.resolveWorkspaceId(userId, dto.workspaceId);
    const created = await this.prisma.$transaction(async (tx) => {
      const prompt = await tx.prompt.create({
        data: {
          title: dto.title,
          description: dto.description,
          content: dto.content,
          language: dto.language,
          model: dto.model,
          isPublic: dto.isPublic ?? false,
          isTemplate: dto.isTemplate ?? false,
          userId,
          workspaceId,
          tags: dto.tagIds?.length
            ? {
                create: dto.tagIds.map((tagId) => ({
                  tagId,
                })),
              }
            : undefined,
        },
      });

      await tx.promptVersion.create({
        data: {
          promptId: prompt.id,
          versionNumber: 1,
          content: dto.content,
        },
      });

      return prompt;
    });

    return this.findOne(userId, created.id);
  }

  async findAll(userId: string, query: ListPromptsQueryDto) {
    const where: Prisma.PromptWhereInput = {
      userId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { content: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.language ? { language: query.language } : {}),
      ...(query.model ? { model: query.model } : {}),
      ...(query.workspaceId ? { workspaceId: query.workspaceId } : {}),
      ...(query.isPublic ? { isPublic: query.isPublic === 'true' } : {}),
      ...(query.isFavorite ? { isFavorite: query.isFavorite === 'true' } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.prompt.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          tags: {
            include: {
              tag: true,
            },
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

  async findOne(userId: string, promptId: string) {
    const prompt = await this.prisma.prompt.findFirst({
      where: { id: promptId, userId, deletedAt: null },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        variables: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
      },
    });

    if (!prompt) {
      throw new NotFoundException('Prompt não encontrado');
    }

    return prompt;
  }

  async update(userId: string, promptId: string, dto: UpdatePromptDto) {
    const prompt = await this.prisma.prompt.findUnique({
      where: { id: promptId },
    });

    if (!prompt || prompt.deletedAt) {
      throw new NotFoundException('Prompt não encontrado');
    }
    if (prompt.userId !== userId) {
      throw new ForbiddenException('Sem permissão para editar este prompt');
    }

    await this.prisma.$transaction(async (tx) => {
      const versionsCount = await tx.promptVersion.count({
        where: { promptId },
      });

      const workspaceId = dto.workspaceId
        ? await this.resolveWorkspaceId(userId, dto.workspaceId)
        : undefined;

      await tx.prompt.update({
        where: { id: promptId },
        data: {
          title: dto.title,
          description: dto.description,
          content: dto.content,
          language: dto.language,
          model: dto.model,
          isPublic: dto.isPublic,
          isTemplate: dto.isTemplate,
          workspaceId,
          tags:
            dto.tagIds !== undefined
              ? {
                  deleteMany: {},
                  create: dto.tagIds.map((tagId) => ({ tagId })),
                }
              : undefined,
        },
      });

      if (dto.content && dto.content !== prompt.content) {
        await tx.promptVersion.create({
          data: {
            promptId,
            versionNumber: versionsCount + 1,
            content: dto.content,
          },
        });
      }
    });

    return this.findOne(userId, promptId);
  }

  async remove(userId: string, promptId: string) {
    const prompt = await this.prisma.prompt.findUnique({
      where: { id: promptId },
    });
    if (!prompt || prompt.deletedAt) {
      throw new NotFoundException('Prompt não encontrado');
    }
    if (prompt.userId !== userId) {
      throw new ForbiddenException('Sem permissão para remover este prompt');
    }

    await this.prisma.prompt.update({
      where: { id: promptId },
      data: { deletedAt: new Date() },
    });

    return { deleted: true };
  }

  async listVersions(userId: string, promptId: string) {
    await this.ensureOwnership(userId, promptId);
    return this.prisma.promptVersion.findMany({
      where: { promptId },
      orderBy: { versionNumber: 'desc' },
    });
  }

  async getVersion(userId: string, promptId: string, versionId: string) {
    await this.ensureOwnership(userId, promptId);
    const version = await this.prisma.promptVersion.findFirst({
      where: { id: versionId, promptId },
    });

    if (!version) {
      throw new NotFoundException('Versão não encontrada');
    }
    return version;
  }

  async restoreVersion(userId: string, promptId: string, versionId: string) {
    await this.ensureOwnership(userId, promptId);
    const version = await this.prisma.promptVersion.findFirst({
      where: { id: versionId, promptId },
    });
    if (!version) {
      throw new NotFoundException('Versão não encontrada');
    }

    await this.prisma.$transaction(async (tx) => {
      const count = await tx.promptVersion.count({
        where: { promptId },
      });
      await tx.prompt.update({
        where: { id: promptId },
        data: { content: version.content },
      });
      await tx.promptVersion.create({
        data: {
          promptId,
          versionNumber: count + 1,
          content: version.content,
        },
      });
    });

    return this.findOne(userId, promptId);
  }

  private async ensureOwnership(userId: string, promptId: string) {
    const prompt = await this.prisma.prompt.findUnique({
      where: { id: promptId },
    });
    if (!prompt || prompt.deletedAt) {
      throw new NotFoundException('Prompt não encontrado');
    }
    if (prompt.userId !== userId) {
      throw new ForbiddenException('Sem permissão para este prompt');
    }
  }

  private async resolveWorkspaceId(userId: string, workspaceId?: string) {
    if (workspaceId) {
      const workspace = await this.prisma.workspace.findFirst({
        where: { id: workspaceId, userId },
      });
      if (!workspace) {
        throw new NotFoundException('Workspace não encontrado');
      }
      return workspace.id;
    }

    const defaultWorkspace = await this.prisma.workspace.findFirst({
      where: { userId, isDefault: true },
    });
    if (!defaultWorkspace) {
      throw new NotFoundException('Workspace padrão não encontrado');
    }
    return defaultWorkspace.id;
  }
}

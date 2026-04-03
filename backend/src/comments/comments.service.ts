import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { WorkspaceRole } from '@prisma/client';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceAccess: WorkspaceAccessService,
  ) {}

  async list(userId: string, promptId: string) {
    const prompt = await this.prisma.prompt.findFirst({
      where: { id: promptId, deletedAt: null },
    });
    if (!prompt) {
      throw new NotFoundException('errors.promptNotFound');
    }
    const ok = await this.workspaceAccess.canAccessPrompt(
      userId,
      prompt,
      WorkspaceRole.viewer,
    );
    if (!ok) {
      throw new NotFoundException('errors.promptNotFound');
    }
    return this.prisma.comment.findMany({
      where: { promptId, parentId: null },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, name: true, email: true } },
            mentions: {
              include: { user: { select: { id: true, email: true } } },
            },
          },
        },
        mentions: { include: { user: { select: { id: true, email: true } } } },
      },
    });
  }

  async create(userId: string, promptId: string, dto: CreateCommentDto) {
    const prompt = await this.prisma.prompt.findFirst({
      where: { id: promptId, deletedAt: null },
    });
    if (!prompt) {
      throw new NotFoundException('errors.promptNotFound');
    }
    const ok = await this.workspaceAccess.canAccessPrompt(
      userId,
      prompt,
      WorkspaceRole.editor,
    );
    if (!ok) {
      throw new NotFoundException('errors.promptNotFound');
    }
    if (dto.parentId) {
      const parent = await this.prisma.comment.findFirst({
        where: { id: dto.parentId, promptId },
      });
      if (!parent) {
        throw new NotFoundException('errors.commentNotFound');
      }
    }

    const mentionEmails = [
      ...new Set(
        (
          dto.content.match(
            /@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
          ) ?? []
        ).map((m) => m.slice(1)),
      ),
    ];
    const mentionedUsers =
      mentionEmails.length > 0
        ? await this.prisma.user.findMany({
            where: { email: { in: mentionEmails } },
            select: { id: true, email: true },
          })
        : [];

    const comment = await this.prisma.comment.create({
      data: {
        promptId,
        userId,
        content: dto.content,
        parentId: dto.parentId,
      },
    });

    if (mentionedUsers.length > 0) {
      await this.prisma.userMention.createMany({
        data: mentionedUsers.map((u) => ({
          commentId: comment.id,
          userId: u.id,
        })),
        skipDuplicates: true,
      });
    }

    return this.prisma.comment.findUniqueOrThrow({
      where: { id: comment.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        mentions: { include: { user: true } },
      },
    });
  }
}

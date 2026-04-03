import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { InviteWorkspaceMemberDto } from './dto/invite-workspace-member.dto';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.workspace.findMany({
      where: {
        OR: [{ userId }, { members: { some: { userId } } }],
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  create(userId: string, dto: CreateWorkspaceDto) {
    return this.prisma.workspace.create({
      data: {
        name: dto.name,
        description: dto.description,
        color: dto.color,
        userId,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateWorkspaceDto) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id, userId },
    });
    if (!workspace) {
      throw new NotFoundException('errors.workspaceNotFound');
    }

    return this.prisma.workspace.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        color: dto.color,
      },
    });
  }

  async remove(userId: string, id: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id, userId },
    });
    if (!workspace) {
      throw new NotFoundException('errors.workspaceNotFound');
    }
    if (workspace.isDefault) {
      throw new BadRequestException('errors.cannotRemoveDefaultWorkspace');
    }

    await this.prisma.workspace.delete({
      where: { id },
    });
    return { deleted: true };
  }

  async listMembers(actorUserId: string, workspaceId: string) {
    await this.assertWorkspaceAdmin(actorUserId, workspaceId);
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { userId: true },
    });
    if (!workspace) {
      throw new NotFoundException('errors.workspaceNotFound');
    }
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
    const owner = await this.prisma.user.findUnique({
      where: { id: workspace.userId },
      select: { id: true, name: true, email: true },
    });
    return {
      owner,
      members: members.map((m) => ({
        id: m.id,
        role: m.role,
        user: m.user,
        invitedAt: m.invitedAt,
      })),
    };
  }

  async inviteMember(
    actorUserId: string,
    workspaceId: string,
    dto: InviteWorkspaceMemberDto,
  ) {
    await this.assertWorkspaceAdmin(actorUserId, workspaceId);
    const invitee = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!invitee) {
      throw new NotFoundException('errors.userNotFound');
    }
    if (invitee.id === actorUserId) {
      throw new BadRequestException('errors.cannotInviteSelf');
    }
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (workspace?.userId === invitee.id) {
      throw new BadRequestException('errors.userAlreadyOwner');
    }
    const role = dto.role ?? WorkspaceRole.viewer;
    return this.prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: { workspaceId, userId: invitee.id },
      },
      create: {
        workspaceId,
        userId: invitee.id,
        role,
        invitedById: actorUserId,
      },
      update: { role },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async removeMember(
    actorUserId: string,
    workspaceId: string,
    memberUserId: string,
  ) {
    await this.assertWorkspaceAdmin(actorUserId, workspaceId);
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (workspace?.userId === memberUserId) {
      throw new BadRequestException('errors.cannotRemoveOwner');
    }
    await this.prisma.workspaceMember.deleteMany({
      where: { workspaceId, userId: memberUserId },
    });
    return { removed: true };
  }

  private async assertWorkspaceAdmin(userId: string, workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace) {
      throw new NotFoundException('errors.workspaceNotFound');
    }
    if (workspace.userId === userId) {
      return;
    }
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    });
    if (!member || member.role !== WorkspaceRole.admin) {
      throw new ForbiddenException('errors.workspaceAdminRequired');
    }
  }
}

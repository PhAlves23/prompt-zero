import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceRole } from '@prisma/client';

const ROLE_RANK: Record<WorkspaceRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  owner: 4,
};

@Injectable()
export class WorkspaceAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async getAccessibleWorkspaceIds(userId: string): Promise<string[]> {
    const owned = await this.prisma.workspace.findMany({
      where: { userId },
      select: { id: true },
    });
    const member = await this.prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true },
    });
    return [
      ...new Set([
        ...owned.map((o) => o.id),
        ...member.map((m) => m.workspaceId),
      ]),
    ];
  }

  async getRoleInWorkspace(
    userId: string,
    workspaceId: string | null,
  ): Promise<WorkspaceRole | null> {
    if (!workspaceId) {
      return null;
    }
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { userId: true },
    });
    if (!ws) {
      return null;
    }
    if (ws.userId === userId) {
      return WorkspaceRole.owner;
    }
    const member = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    });
    return member?.role ?? null;
  }

  roleMeetsMinimum(role: WorkspaceRole | null, min: WorkspaceRole): boolean {
    if (!role) {
      return false;
    }
    return ROLE_RANK[role] >= ROLE_RANK[min];
  }

  async canAccessPrompt(
    userId: string,
    prompt: { userId: string; workspaceId: string | null },
    minRole: WorkspaceRole = WorkspaceRole.viewer,
  ): Promise<boolean> {
    if (prompt.userId === userId) {
      return true;
    }
    if (!prompt.workspaceId) {
      return false;
    }
    const accessible = await this.getAccessibleWorkspaceIds(userId);
    if (!accessible.includes(prompt.workspaceId)) {
      return false;
    }
    const role = await this.getRoleInWorkspace(userId, prompt.workspaceId);
    return this.roleMeetsMinimum(role, minRole);
  }
}

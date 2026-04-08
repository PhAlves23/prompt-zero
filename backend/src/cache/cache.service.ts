import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { ProviderType, WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CachedLlmExecution, RedisService } from '../redis/redis.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { UpdateCacheConfigDto } from './dto/update-cache-config.dto';

@Injectable()
export class CacheService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly workspaceAccess: WorkspaceAccessService,
  ) {}

  generateContentHash(params: {
    promptContent: string;
    variables: Record<string, string> | null | undefined;
    model: string;
    provider: ProviderType;
    temperature: number;
    maxTokens: number;
    topP: number;
    topK: number;
    credentialId?: string | null;
  }): string {
    const payload = JSON.stringify({
      prompt: params.promptContent,
      variables: params.variables ?? {},
      model: params.model,
      provider: params.provider,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
      topP: params.topP,
      topK: params.topK,
      credentialId: params.credentialId ?? null,
    });
    return createHash('sha256').update(payload).digest('hex');
  }

  /** Chave Redis: compartilhada no workspace (mesmo hash = mesma resposta). */
  buildExecutionRedisKey(workspaceId: string, contentHash: string): string {
    return `cache:exec:ws:${workspaceId}:${contentHash}`;
  }

  async getWorkspaceCacheConfig(workspaceId: string | null) {
    if (!workspaceId) {
      return { enabled: false, ttlSeconds: 86400 };
    }

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { cacheEnabled: true, cacheTtlSeconds: true },
    });

    if (!workspace) {
      return { enabled: false, ttlSeconds: 86400 };
    }

    return {
      enabled: workspace.cacheEnabled,
      ttlSeconds: workspace.cacheTtlSeconds,
    };
  }

  async getCachedExecution(
    workspaceId: string,
    contentHash: string,
  ): Promise<CachedLlmExecution | null> {
    if (!this.redis.isEnabled()) {
      return null;
    }
    const key = this.buildExecutionRedisKey(workspaceId, contentHash);
    return this.redis.getCachedExecution(key);
  }

  async setCachedExecution(
    workspaceId: string,
    contentHash: string,
    value: CachedLlmExecution,
    ttlSeconds: number,
  ): Promise<void> {
    if (!this.redis.isEnabled()) {
      return;
    }
    const key = this.buildExecutionRedisKey(workspaceId, contentHash);
    await this.redis.setCachedExecution(key, value, ttlSeconds);
  }

  async invalidateWorkspaceExecutionCache(
    workspaceId: string,
  ): Promise<number> {
    if (!this.redis.isEnabled()) {
      return 0;
    }
    const pattern = `cache:exec:ws:${workspaceId}:*`;
    return this.redis.invalidateCacheByPattern(pattern);
  }

  async invalidateForUser(
    userId: string,
    workspaceId: string,
  ): Promise<{ deleted: number }> {
    await this.assertWorkspaceAccess(userId, workspaceId, WorkspaceRole.admin);
    const deleted = await this.invalidateWorkspaceExecutionCache(workspaceId);
    return { deleted };
  }

  async assertWorkspaceAccess(
    userId: string,
    workspaceId: string,
    minRole: WorkspaceRole,
  ): Promise<void> {
    const accessible =
      await this.workspaceAccess.getAccessibleWorkspaceIds(userId);
    if (!accessible.includes(workspaceId)) {
      throw new ForbiddenException('errors.workspaceForbidden');
    }
    const role = await this.workspaceAccess.getRoleInWorkspace(
      userId,
      workspaceId,
    );
    if (!this.workspaceAccess.roleMeetsMinimum(role, minRole)) {
      throw new ForbiddenException('errors.workspaceAdminRequired');
    }
  }

  async getConfig(userId: string, workspaceId: string) {
    await this.assertWorkspaceAccess(userId, workspaceId, WorkspaceRole.viewer);
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        cacheEnabled: true,
        cacheTtlSeconds: true,
      },
    });
    if (!workspace) {
      throw new NotFoundException('errors.workspaceNotFound');
    }
    return {
      workspaceId: workspace.id,
      cacheEnabled: workspace.cacheEnabled,
      cacheTtlSeconds: workspace.cacheTtlSeconds,
    };
  }

  async updateConfig(
    userId: string,
    workspaceId: string,
    dto: UpdateCacheConfigDto,
  ) {
    await this.assertWorkspaceAccess(userId, workspaceId, WorkspaceRole.admin);
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId },
    });
    if (!workspace) {
      throw new NotFoundException('errors.workspaceNotFound');
    }

    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(dto.cacheEnabled !== undefined && {
          cacheEnabled: dto.cacheEnabled,
        }),
        ...(dto.cacheTtlSeconds !== undefined && {
          cacheTtlSeconds: dto.cacheTtlSeconds,
        }),
      },
      select: {
        id: true,
        cacheEnabled: true,
        cacheTtlSeconds: true,
      },
    });
  }
}

import { ProviderType } from '@prisma/client';
import { CacheService } from './cache.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { RedisService } from '../redis/redis.service';
import type { WorkspaceAccessService } from '../workspaces/workspace-access.service';

describe('CacheService', () => {
  const prismaMock = {
    workspace: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const redisMock = {
    isEnabled: jest.fn().mockReturnValue(true),
    getCachedExecution: jest.fn(),
    setCachedExecution: jest.fn(),
    invalidateCacheByPattern: jest.fn(),
  };

  const workspaceAccessMock = {
    getAccessibleWorkspaceIds: jest.fn(),
    getRoleInWorkspace: jest.fn(),
    roleMeetsMinimum: jest.fn(),
  };

  let service: CacheService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CacheService(
      prismaMock as unknown as PrismaService,
      redisMock as unknown as RedisService,
      workspaceAccessMock as unknown as WorkspaceAccessService,
    );
  });

  it('generateContentHash é determinístico para mesmos parâmetros', () => {
    const params = {
      promptContent: 'Olá {{x}}',
      variables: { x: '1' },
      model: 'gpt-4o-mini',
      provider: ProviderType.openai,
      temperature: 0.2,
      maxTokens: 100,
      topP: 0.9,
      topK: 10,
      credentialId: 'cred-1',
    };
    expect(service.generateContentHash(params)).toBe(
      service.generateContentHash(params),
    );
  });

  it('generateContentHash difere quando credentialId muda', () => {
    const base = {
      promptContent: 'teste',
      variables: null,
      model: 'm',
      provider: ProviderType.openai,
      temperature: 0,
      maxTokens: 1,
      topP: 1,
      topK: 1,
    };
    const a = service.generateContentHash({ ...base, credentialId: 'a' });
    const b = service.generateContentHash({ ...base, credentialId: 'b' });
    expect(a).not.toBe(b);
  });

  it('buildExecutionRedisKey inclui workspace e hash', () => {
    expect(service.buildExecutionRedisKey('ws-1', 'abc')).toBe(
      'cache:exec:ws:ws-1:abc',
    );
  });

  it('getWorkspaceCacheConfig retorna disabled sem workspace', async () => {
    await expect(service.getWorkspaceCacheConfig(null)).resolves.toEqual({
      enabled: false,
      ttlSeconds: 86400,
    });
    expect(prismaMock.workspace.findUnique).not.toHaveBeenCalled();
  });
});

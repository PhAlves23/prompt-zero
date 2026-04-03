import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PromptsService } from './prompts.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { WebhooksService } from '../webhooks/webhooks.service';

describe('PromptsService', () => {
  let service: PromptsService;

  const txMock = {
    prompt: {
      create: jest.fn(),
      update: jest.fn(),
    },
    promptVersion: {
      create: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    templateVariable: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    promptTag: {
      createMany: jest.fn(),
    },
    tag: {
      findMany: jest.fn(),
    },
    execution: {
      count: jest.fn(),
    },
  };

  const workspaceAccessMock = {
    getAccessibleWorkspaceIds: jest.fn().mockResolvedValue([]),
    canAccessPrompt: jest.fn().mockResolvedValue(true),
    getRoleInWorkspace: jest.fn(),
    roleMeetsMinimum: jest.fn().mockReturnValue(true),
  };

  const webhooksServiceMock = {
    emit: jest.fn(),
  };

  const prismaServiceMock = {
    $transaction: jest.fn(),
    prompt: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    promptVersion: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    workspace: {
      findFirst: jest.fn(),
    },
    tag: {
      count: jest.fn(),
    },
    templateVariable: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    execution: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    prismaServiceMock.$transaction.mockImplementation(async (arg: unknown) => {
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      if (typeof arg === 'function') {
        return (arg as (tx: typeof txMock) => Promise<unknown>)(txMock);
      }
      throw new Error('unexpected $transaction arg');
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromptsService,
        { provide: PrismaService, useValue: prismaServiceMock },
        { provide: WorkspaceAccessService, useValue: workspaceAccessMock },
        { provide: WebhooksService, useValue: webhooksServiceMock },
      ],
    }).compile();

    service = module.get<PromptsService>(PromptsService);
  });

  const fullPrompt = {
    id: 'prompt-1',
    userId: 'user-1',
    title: 'T',
    content: 'Conteúdo com mais de dez caracteres para validação.',
    deletedAt: null,
    tags: [],
    variables: [],
    versions: [{ versionNumber: 1 }],
  };

  it('findAll retorna dados paginados', async () => {
    prismaServiceMock.prompt.findMany.mockResolvedValue([fullPrompt]);
    prismaServiceMock.prompt.count.mockResolvedValue(1);

    const result = await service.findAll('user-1', {
      page: 1,
      limit: 20,
    } as never);

    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(result.meta.totalPages).toBe(1);
  });

  it('findOne lança NotFoundException quando prompt não existe', async () => {
    prismaServiceMock.prompt.findFirst.mockResolvedValue(null);

    await expect(service.findOne('user-1', 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('findOne retorna prompt quando existe', async () => {
    prismaServiceMock.prompt.findFirst.mockResolvedValue(fullPrompt);

    const result = await service.findOne('user-1', 'prompt-1');

    expect(result.id).toBe('prompt-1');
  });

  it('create cria prompt, versão inicial e retorna findOne', async () => {
    prismaServiceMock.workspace.findFirst.mockResolvedValue({ id: 'ws-1' });
    txMock.prompt.create.mockResolvedValue({
      id: 'new-id',
      userId: 'user-1',
    });
    txMock.promptVersion.create.mockResolvedValue({});

    prismaServiceMock.prompt.findFirst.mockResolvedValue({
      ...fullPrompt,
      id: 'new-id',
    });

    const result = await service.create('user-1', {
      title: 'Novo',
      content: 'Conteúdo com mais de dez caracteres para validação.',
      language: 'pt',
      model: 'gpt-4o-mini',
    });

    expect(txMock.prompt.create).toHaveBeenCalled();
    expect(txMock.promptVersion.create).toHaveBeenCalled();
    const versionCreateCalls = txMock.promptVersion.create.mock.calls as Array<
      [{ data: { versionNumber: number } }]
    >;
    const createVersionArgs = versionCreateCalls[0]?.[0];
    expect(createVersionArgs?.data.versionNumber).toBe(1);
    expect(result.id).toBe('new-id');
  });

  it('create com tagIds rejeita quando usuário não possui todas as tags', async () => {
    prismaServiceMock.workspace.findFirst.mockResolvedValue({ id: 'ws-1' });
    prismaServiceMock.tag.count.mockResolvedValue(0);

    await expect(
      service.create('user-1', {
        title: 'Novo',
        content: 'Conteúdo com mais de dez caracteres para validação.',
        language: 'pt',
        model: 'gpt-4o-mini',
        tagIds: ['tag-alheia'],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prismaServiceMock.tag.count).toHaveBeenCalledWith({
      where: { userId: 'user-1', id: { in: ['tag-alheia'] } },
    });
    expect(txMock.prompt.create).not.toHaveBeenCalled();
  });

  it('update cria nova versão quando content muda', async () => {
    prismaServiceMock.prompt.findFirst
      .mockResolvedValueOnce({
        id: 'prompt-1',
        userId: 'user-1',
        content: 'Antigo conteúdo com mais de dez caracteres aqui.',
        deletedAt: null,
        workspaceId: null,
      })
      .mockResolvedValueOnce({
        ...fullPrompt,
        content: 'Novo conteúdo com mais de dez caracteres aqui.',
      });
    txMock.promptVersion.aggregate.mockResolvedValue({
      _max: { versionNumber: 1 },
    });
    txMock.promptVersion.create.mockResolvedValue({});
    txMock.prompt.update.mockResolvedValue({});

    await service.update('user-1', 'prompt-1', {
      content: 'Novo conteúdo com mais de dez caracteres aqui.',
    });

    expect(txMock.promptVersion.create).toHaveBeenCalled();
    const versionCreateCalls = txMock.promptVersion.create.mock.calls as Array<
      [{ data: { versionNumber: number } }]
    >;
    const createVersionArgs = versionCreateCalls[0]?.[0];
    expect(createVersionArgs?.data.versionNumber).toBe(2);
  });

  it('update não cria versão quando content não muda', async () => {
    const same =
      'Mesmo conteúdo com mais de dez caracteres para o teste unitário.';
    prismaServiceMock.prompt.findFirst
      .mockResolvedValueOnce({
        id: 'prompt-1',
        userId: 'user-1',
        content: same,
        deletedAt: null,
        workspaceId: null,
      })
      .mockResolvedValueOnce({
        ...fullPrompt,
        content: same,
      });
    txMock.prompt.update.mockResolvedValue({});

    await service.update('user-1', 'prompt-1', {
      title: 'Só título',
      content: same,
    });

    expect(txMock.promptVersion.create).not.toHaveBeenCalled();
  });

  it('update lança ForbiddenException quando usuário não é dono', async () => {
    prismaServiceMock.prompt.findFirst.mockResolvedValue({
      id: 'prompt-1',
      userId: 'outro',
      content: 'x',
      deletedAt: null,
      workspaceId: null,
    });

    await expect(
      service.update('user-1', 'prompt-1', { title: 'Hack' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('remove faz soft delete', async () => {
    prismaServiceMock.prompt.findFirst.mockResolvedValue({
      id: 'prompt-1',
      userId: 'user-1',
      deletedAt: null,
      workspaceId: null,
    });
    prismaServiceMock.prompt.update.mockResolvedValue({});

    const result = await service.remove('user-1', 'prompt-1');

    expect(prismaServiceMock.prompt.update).toHaveBeenCalled();
    const removeUpdateCalls = prismaServiceMock.prompt.update.mock
      .calls as Array<[{ where: { id: string }; data: { deletedAt: Date } }]>;
    const removeUpdateArgs = removeUpdateCalls[0]?.[0];
    expect(removeUpdateArgs?.where).toEqual({ id: 'prompt-1' });
    expect(removeUpdateArgs?.data.deletedAt).toBeInstanceOf(Date);
    expect(result).toEqual({ deleted: true });
  });

  it('forkPrompt lança NotFound quando prompt não é público', async () => {
    prismaServiceMock.prompt.findUnique.mockResolvedValue({
      id: 'p1',
      isPublic: false,
      deletedAt: null,
      versions: [],
      variables: [],
      tags: [],
    });

    await expect(service.forkPrompt('user-1', 'p1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('forkPrompt duplica prompt público', async () => {
    prismaServiceMock.workspace.findFirst.mockResolvedValue({ id: 'ws-1' });
    prismaServiceMock.prompt.findUnique.mockResolvedValue({
      id: 'orig',
      title: 'Público',
      description: 'd',
      language: 'pt',
      model: 'gpt-4o-mini',
      isPublic: true,
      isTemplate: false,
      deletedAt: null,
      forkCount: 0,
      versions: [
        {
          versionNumber: 1,
          content: 'Conteúdo forkável com mais de dez caracteres.',
        },
      ],
      variables: [],
      tags: [],
    });
    txMock.prompt.update.mockResolvedValue({});
    txMock.prompt.create.mockResolvedValue({ id: 'fork-id', userId: 'user-1' });
    txMock.promptVersion.create.mockResolvedValue({});

    prismaServiceMock.prompt.findFirst.mockResolvedValue({
      ...fullPrompt,
      id: 'fork-id',
      title: 'Público (Fork)',
    });

    const result = await service.forkPrompt('user-1', 'orig');

    expect(txMock.prompt.create).toHaveBeenCalled();
    expect(result.id).toBe('fork-id');
  });

  it('syncTemplateVariables lança quando faltam variáveis detectadas', async () => {
    prismaServiceMock.prompt.findFirst.mockResolvedValue({
      id: 'prompt-1',
      userId: 'user-1',
      content: 'Olá {{nome}} e {{cidade}}',
      deletedAt: null,
      workspaceId: null,
    });

    await expect(
      service.syncTemplateVariables('user-1', 'prompt-1', {
        variables: [{ name: 'nome', type: 'text' }],
      } as never),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('removeVersion lança BadRequestException na última versão', async () => {
    prismaServiceMock.prompt.findFirst.mockResolvedValue({
      id: 'prompt-1',
      userId: 'user-1',
      deletedAt: null,
      workspaceId: null,
    });
    prismaServiceMock.promptVersion.findFirst.mockResolvedValue({ id: 'v1' });
    prismaServiceMock.$transaction.mockResolvedValueOnce([1, 0]);

    await expect(
      service.removeVersion('user-1', 'prompt-1', 'v1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

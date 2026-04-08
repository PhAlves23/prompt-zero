import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { PrismaService } from '../prisma/prisma.service';

describe('WorkspacesService', () => {
  let service: WorkspacesService;

  const prismaServiceMock = {
    workspace: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspacesService,
        { provide: PrismaService, useValue: prismaServiceMock },
      ],
    }).compile();

    service = module.get<WorkspacesService>(WorkspacesService);
  });

  it('findAll retorna workspaces ordenados', async () => {
    prismaServiceMock.workspace.findMany.mockResolvedValue([
      { id: 'w1', name: 'Default', isDefault: true },
    ]);

    const result = await service.findAll('user-1');

    expect(prismaServiceMock.workspace.findMany).toHaveBeenCalledWith({
      where: {
        OR: [{ userId: 'user-1' }, { members: { some: { userId: 'user-1' } } }],
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    expect(result).toHaveLength(1);
  });

  it('create persiste workspace', async () => {
    prismaServiceMock.workspace.create.mockResolvedValue({
      id: 'w-new',
      name: 'Growth',
      userId: 'user-1',
    });

    const result = await service.create('user-1', {
      name: 'Growth',
      description: 'desc',
      color: '#fff',
    });

    expect(prismaServiceMock.workspace.create).toHaveBeenCalledWith({
      data: {
        name: 'Growth',
        description: 'desc',
        color: '#fff',
        userId: 'user-1',
      },
    });
    expect(result.id).toBe('w-new');
  });

  it('update lança NotFoundException quando workspace não existe', async () => {
    prismaServiceMock.workspace.findFirst.mockResolvedValue(null);

    await expect(
      service.update('user-1', 'missing', { name: 'X' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prismaServiceMock.workspace.update).not.toHaveBeenCalled();
  });

  it('update persiste alterações quando workspace existe', async () => {
    prismaServiceMock.workspace.findFirst.mockResolvedValue({
      id: 'w1',
      userId: 'user-1',
    });
    prismaServiceMock.workspace.update.mockResolvedValue({
      id: 'w1',
      name: 'Renamed',
    });

    const result = await service.update('user-1', 'w1', { name: 'Renamed' });

    expect(prismaServiceMock.workspace.update).toHaveBeenCalledWith({
      where: { id: 'w1' },
      data: { name: 'Renamed', description: undefined, color: undefined },
    });
    expect(result.name).toBe('Renamed');
  });

  it('remove lança NotFoundException quando workspace não existe', async () => {
    prismaServiceMock.workspace.findFirst.mockResolvedValue(null);

    await expect(service.remove('user-1', 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('remove lança BadRequestException quando workspace é o padrão', async () => {
    prismaServiceMock.workspace.findFirst.mockResolvedValue({
      id: 'w-default',
      userId: 'user-1',
      isDefault: true,
    });

    await expect(service.remove('user-1', 'w-default')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prismaServiceMock.workspace.delete).not.toHaveBeenCalled();
  });

  it('remove deleta workspace quando não é padrão', async () => {
    prismaServiceMock.workspace.findFirst.mockResolvedValue({
      id: 'w2',
      userId: 'user-1',
      isDefault: false,
    });

    const result = await service.remove('user-1', 'w2');

    expect(prismaServiceMock.workspace.delete).toHaveBeenCalledWith({
      where: { id: 'w2' },
    });
    expect(result).toEqual({ deleted: true });
  });
});

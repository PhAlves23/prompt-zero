import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TagsService } from './tags.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TagsService', () => {
  let service: TagsService;

  const prismaServiceMock = {
    tag: {
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
        TagsService,
        { provide: PrismaService, useValue: prismaServiceMock },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
  });

  it('findAll lista tags do usuário', async () => {
    prismaServiceMock.tag.findMany.mockResolvedValue([
      { id: 't1', name: 'Marketing', slug: 'marketing' },
    ]);

    const result = await service.findAll('user-1');

    expect(prismaServiceMock.tag.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toHaveLength(1);
  });

  it('create gera slug a partir do nome', async () => {
    prismaServiceMock.tag.create.mockResolvedValue({
      id: 't-new',
      name: 'Minha Tag',
      slug: 'minha-tag',
    });

    await service.create('user-1', {
      name: 'Minha Tag',
      color: '#000000',
    });

    expect(prismaServiceMock.tag.create).toHaveBeenCalledWith({
      data: {
        name: 'Minha Tag',
        slug: 'minha-tag',
        color: '#000000',
        userId: 'user-1',
      },
    });
  });

  it('update lança NotFound quando tag não existe', async () => {
    prismaServiceMock.tag.findFirst.mockResolvedValue(null);

    await expect(
      service.update('user-1', 'missing', { name: 'X' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('update aplica slug quando nome é informado', async () => {
    prismaServiceMock.tag.findFirst.mockResolvedValue({
      id: 't1',
      userId: 'user-1',
    });
    prismaServiceMock.tag.update.mockResolvedValue({ id: 't1', name: 'Novo' });

    await service.update('user-1', 't1', { name: 'Novo Nome', color: '#fff' });

    expect(prismaServiceMock.tag.update).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: {
        name: 'Novo Nome',
        slug: 'novo-nome',
        color: '#fff',
      },
    });
  });

  it('remove lança NotFound quando tag não existe', async () => {
    prismaServiceMock.tag.findFirst.mockResolvedValue(null);

    await expect(service.remove('user-1', 'missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('remove deleta tag existente', async () => {
    prismaServiceMock.tag.findFirst.mockResolvedValue({
      id: 't1',
      userId: 'user-1',
    });

    const result = await service.remove('user-1', 't1');

    expect(prismaServiceMock.tag.delete).toHaveBeenCalledWith({
      where: { id: 't1' },
    });
    expect(result).toEqual({ deleted: true });
  });
});

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.workspace.findMany({
      where: { userId },
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
      throw new NotFoundException('Workspace não encontrado');
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
      throw new NotFoundException('Workspace não encontrado');
    }
    if (workspace.isDefault) {
      throw new BadRequestException(
        'Não é possível remover o workspace padrão',
      );
    }

    await this.prisma.workspace.delete({
      where: { id },
    });
    return { deleted: true };
  }
}

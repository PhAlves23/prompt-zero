import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { NotFoundException } from '@nestjs/common';
import { slugify } from '../common/utils/string.util';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(userId: string) {
    return this.prisma.tag.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(userId: string, dto: CreateTagDto) {
    return this.prisma.tag.create({
      data: {
        name: dto.name,
        slug: slugify(dto.name),
        color: dto.color,
        userId,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateTagDto) {
    const tag = await this.prisma.tag.findFirst({
      where: { id, userId },
    });
    if (!tag) {
      throw new NotFoundException('errors.tagNotFound');
    }

    return this.prisma.tag.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.name ? slugify(dto.name) : undefined,
        color: dto.color,
      },
    });
  }

  async remove(userId: string, id: string) {
    const tag = await this.prisma.tag.findFirst({
      where: { id, userId },
    });
    if (!tag) {
      throw new NotFoundException('errors.tagNotFound');
    }
    await this.prisma.tag.delete({
      where: { id },
    });
    return { deleted: true };
  }
}

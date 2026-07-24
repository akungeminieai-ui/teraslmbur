import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { IUnitRepository } from '../domain/unit.repository.interface';
import { Unit, UnitType } from '@/generated/client';

@Injectable()
export class PrismaUnitRepository implements IUnitRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { name: string; abbreviation: string; type: UnitType }): Promise<Unit> {
    return this.prisma.unit.create({
      data,
    });
  }

  async findAll(query?: {
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ items: Unit[]; total: number }> {
    const page = query?.page || 1;
    const pageSize = query?.pageSize || 10;
    const skip = (page - 1) * pageSize;
    const sortBy = query?.sortBy || 'name';
    const sortOrder = query?.sortOrder || 'asc';

    const where: any = {
      deletedAt: null,
    };

    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { abbreviation: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.unit.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: {
          _count: {
            select: {
              ingredients: true,
              purchaseIngredients: true,
              recipeItems: true,
            },
          },
        },
      }),
      this.prisma.unit.count({ where }),
    ]);

    return { items, total };
  }

  async findById(id: string): Promise<Unit | null> {
    return this.prisma.unit.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByName(name: string): Promise<Unit | null> {
    return this.prisma.unit.findFirst({
      where: { name, deletedAt: null },
    });
  }

  async findByAbbreviation(abbreviation: string): Promise<Unit | null> {
    return this.prisma.unit.findFirst({
      where: { abbreviation, deletedAt: null },
    });
  }

  async update(id: string, data: { name?: string; abbreviation?: string; type?: UnitType }): Promise<Unit> {
    return this.prisma.unit.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string): Promise<Unit> {
    return this.prisma.unit.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

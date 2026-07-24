import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { IIngredientRepository } from '../domain/ingredient.repository.interface';
import { Ingredient, IngredientTranslation } from '@/generated/client';
import { Decimal } from '@/generated/client/runtime/library';

@Injectable()
export class PrismaIngredientRepository implements IIngredientRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    sku?: string | null;
    inventoryUnitId: string;
    purchaseUnitId?: string | null;
    minimumStock?: number | string;
    reorderLevel?: number | string;
    idealStock?: number | string;
    conversionRatio?: number | string;
    supplierReference?: string | null;
    costPerUnit?: number | string;
    isActive?: boolean;
    notes?: string | null;
    translations: { locale: string; name: string; description?: string | null }[];
  }): Promise<Ingredient & { translations: IngredientTranslation[] }> {
    return this.prisma.$transaction(async (tx) => {
      const ingredient = await tx.ingredient.create({
        data: {
          sku: data.sku,
          inventoryUnitId: data.inventoryUnitId,
          purchaseUnitId: data.purchaseUnitId,
          minimumStock: data.minimumStock ? new Decimal(data.minimumStock) : undefined,
          reorderLevel: data.reorderLevel ? new Decimal(data.reorderLevel) : undefined,
          idealStock: data.idealStock ? new Decimal(data.idealStock) : undefined,
          conversionRatio: data.conversionRatio ? new Decimal(data.conversionRatio) : undefined,
          supplierReference: data.supplierReference,
          costPerUnit: data.costPerUnit ? new Decimal(data.costPerUnit) : undefined,
          isActive: data.isActive,
          notes: data.notes,
        },
      });

      const translations = await Promise.all(
        data.translations.map((t) =>
          tx.ingredientTranslation.create({
            data: {
              ingredientId: ingredient.id,
              locale: t.locale,
              name: t.name,
              description: t.description,
            },
          })
        )
      );

      return { ...ingredient, translations };
    });
  }

  async findAll(query?: {
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    isActive?: boolean;
  }): Promise<{
    items: (Ingredient & {
      translations: IngredientTranslation[];
      inventoryUnit: { id: string; name: string; abbreviation: string };
      purchaseUnit: { id: string; name: string; abbreviation: string } | null;
    })[];
    total: number;
  }> {
    const page = query?.page || 1;
    const pageSize = query?.pageSize || 10;
    const skip = (page - 1) * pageSize;
    const sortBy = query?.sortBy || 'createdAt';
    const sortOrder = query?.sortOrder || 'desc';

    const where: any = {
      deletedAt: null,
    };

    if (query?.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query?.search) {
      where.OR = [
        { sku: { contains: query.search, mode: 'insensitive' } },
        { supplierReference: { contains: query.search, mode: 'insensitive' } },
        {
          translations: {
            some: {
              name: { contains: query.search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.ingredient.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: {
          translations: true,
          inventoryUnit: {
            select: { id: true, name: true, abbreviation: true, type: true },
          },
          purchaseUnit: {
            select: { id: true, name: true, abbreviation: true },
          },
        },
      }),
      this.prisma.ingredient.count({ where }),
    ]);

    // Aggregate Current Stocks
    const stockSums = await this.prisma.inventoryTransaction.groupBy({
      by: ['ingredientId'],
      _sum: { quantity: true },
    });
    const stockMap = new Map(stockSums.map((s) => [s.ingredientId, s._sum?.quantity?.toNumber() || 0]));

    // Aggregate Today's Usage
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const usageSums = await this.prisma.inventoryTransaction.groupBy({
      by: ['ingredientId'],
      where: {
        createdAt: { gte: startOfToday },
        type: { in: ['OUT', 'WASTE'] },
      },
      _sum: { quantity: true },
    });
    const usageMap = new Map(usageSums.map((u) => [u.ingredientId, Math.abs(u._sum?.quantity?.toNumber() || 0)]));

    const enrichedItems = items.map((item) => ({
      ...item,
      currentStock: stockMap.get(item.id) || 0,
      todayUsage: usageMap.get(item.id) || 0,
    }));

    return { items: enrichedItems, total };
  }

  async findById(id: string): Promise<(Ingredient & { translations: IngredientTranslation[] }) | null> {
    return this.prisma.ingredient.findFirst({
      where: { id, deletedAt: null },
      include: { translations: true },
    });
  }

  async findBySku(sku: string): Promise<Ingredient | null> {
    return this.prisma.ingredient.findFirst({
      where: { sku, deletedAt: null },
    });
  }

  async update(
    id: string,
    data: {
      sku?: string | null;
      inventoryUnitId?: string;
      purchaseUnitId?: string | null;
      minimumStock?: number | string;
      reorderLevel?: number | string;
      idealStock?: number | string;
      conversionRatio?: number | string;
      supplierReference?: string | null;
      costPerUnit?: number | string;
      isActive?: boolean;
      notes?: string | null;
      translations?: { locale: string; name: string; description?: string | null }[];
    }
  ): Promise<Ingredient & { translations: IngredientTranslation[] }> {
    return this.prisma.$transaction(async (tx) => {
      const ingredient = await tx.ingredient.update({
        where: { id },
        data: {
          sku: data.sku,
          inventoryUnitId: data.inventoryUnitId,
          purchaseUnitId: data.purchaseUnitId,
          minimumStock: data.minimumStock ? new Decimal(data.minimumStock) : undefined,
          reorderLevel: data.reorderLevel ? new Decimal(data.reorderLevel) : undefined,
          idealStock: data.idealStock ? new Decimal(data.idealStock) : undefined,
          conversionRatio: data.conversionRatio ? new Decimal(data.conversionRatio) : undefined,
          supplierReference: data.supplierReference,
          costPerUnit: data.costPerUnit ? new Decimal(data.costPerUnit) : undefined,
          isActive: data.isActive,
          notes: data.notes,
        },
      });

      if (data.translations) {
        // Upsert translations
        await Promise.all(
          data.translations.map((t) =>
            tx.ingredientTranslation.upsert({
              where: {
                ingredientId_locale: {
                  ingredientId: id,
                  locale: t.locale,
                },
              },
              update: { name: t.name, description: t.description },
              create: {
                ingredientId: id,
                locale: t.locale,
                name: t.name,
                description: t.description,
              },
            })
          )
        );
      }

      const translations = await tx.ingredientTranslation.findMany({
        where: { ingredientId: id },
      });

      return { ...ingredient, translations };
    });
  }

  async softDelete(id: string): Promise<Ingredient> {
    return this.prisma.ingredient.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getCurrentStock(ingredientId: string): Promise<number> {
    const aggregate = await this.prisma.inventoryTransaction.aggregate({
      where: { ingredientId },
      _sum: { quantity: true },
    });
    return aggregate._sum.quantity?.toNumber() || 0;
  }

  async createTransaction(ingredientId: string, quantity: number, notes?: string) {
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id: ingredientId },
    });
    if (!ingredient) return null;

    return this.prisma.inventoryTransaction.create({
      data: {
        ingredientId,
        outletId: 'default-outlet',
        quantity: new Decimal(quantity),
        unitId: ingredient.inventoryUnitId,
        type: 'ADJUSTMENT',
        notes: notes || 'Manual stock adjustment',
      },
    });
  }
}

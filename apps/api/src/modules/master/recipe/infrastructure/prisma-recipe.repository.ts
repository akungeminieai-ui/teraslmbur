import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { IRecipeRepository, RecipeWithItems } from '../domain/recipe.repository.interface';
import { Recipe } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const RECIPE_INCLUDE = {
  items: {
    include: {
      ingredient: {
        include: {
          translations: true,
          inventoryUnit: {
            select: { id: true, name: true, abbreviation: true, type: true },
          },
        },
      },
      unit: {
        select: { id: true, name: true, abbreviation: true, type: true },
      },
    },
  },
  product: {
    select: {
      id: true,
      sellingPrice: true,
      currentHpp: true,
      translations: {
        select: { locale: true, name: true },
      },
    },
  },
} as const;

@Injectable()
export class PrismaRecipeRepository implements IRecipeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    productId: string;
    version: number;
    notes?: string | null;
    isActive?: boolean;
    items: {
      ingredientId: string;
      quantity: number | string;
      unitId?: string | null;
      wastePercentage?: number | string;
      notes?: string | null;
    }[];
  }): Promise<RecipeWithItems> {
    return this.prisma.$transaction(async (tx) => {
      const recipe = await tx.recipe.create({
        data: {
          productId: data.productId,
          version: data.version,
          notes: data.notes,
          isActive: data.isActive ?? true,
        },
      });

      await Promise.all(
        data.items.map((item) =>
          tx.recipeItem.create({
            data: {
              recipeId: recipe.id,
              ingredientId: item.ingredientId,
              quantity: new Decimal(item.quantity),
              unitId: item.unitId || null,
              wastePercentage: item.wastePercentage
                ? new Decimal(item.wastePercentage)
                : new Decimal(0),
              notes: item.notes || null,
            },
          }),
        ),
      );

      return tx.recipe.findUniqueOrThrow({
        where: { id: recipe.id },
        include: RECIPE_INCLUDE,
      }) as unknown as RecipeWithItems;
    });
  }

  async findAll(query?: {
    productId?: string;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ items: RecipeWithItems[]; total: number }> {
    const page = query?.page || 1;
    const pageSize = query?.pageSize || 10;
    const skip = (page - 1) * pageSize;
    const sortBy = query?.sortBy || 'createdAt';
    const sortOrder = query?.sortOrder || 'desc';

    const where: any = {
      deletedAt: null,
    };

    if (query?.productId) {
      where.productId = query.productId;
    }

    if (query?.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [items, total] = await Promise.all([
      this.prisma.recipe.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: RECIPE_INCLUDE,
      }),
      this.prisma.recipe.count({ where }),
    ]);

    return { items: items as unknown as RecipeWithItems[], total };
  }

  async findById(id: string): Promise<RecipeWithItems | null> {
    const recipe = await this.prisma.recipe.findFirst({
      where: { id, deletedAt: null },
      include: RECIPE_INCLUDE,
    });
    return recipe as unknown as RecipeWithItems | null;
  }

  async findActiveByProductId(productId: string): Promise<RecipeWithItems | null> {
    const recipe = await this.prisma.recipe.findFirst({
      where: { productId, isActive: true, deletedAt: null },
      include: RECIPE_INCLUDE,
    });
    return recipe as unknown as RecipeWithItems | null;
  }

  async getMaxVersion(productId: string): Promise<number> {
    const result = await this.prisma.recipe.aggregate({
      where: { productId },
      _max: { version: true },
    });
    return result._max.version || 0;
  }

  async update(
    id: string,
    data: {
      notes?: string | null;
      isActive?: boolean;
      items?: {
        ingredientId: string;
        quantity: number | string;
        unitId?: string | null;
        wastePercentage?: number | string;
        notes?: string | null;
      }[];
    },
  ): Promise<RecipeWithItems> {
    return this.prisma.$transaction(async (tx) => {
      // Update recipe fields
      await tx.recipe.update({
        where: { id },
        data: {
          notes: data.notes,
          isActive: data.isActive,
        },
      });

      // Clear & recreate items if provided
      if (data.items) {
        await tx.recipeItem.deleteMany({
          where: { recipeId: id },
        });

        await Promise.all(
          data.items.map((item) =>
            tx.recipeItem.create({
              data: {
                recipeId: id,
                ingredientId: item.ingredientId,
                quantity: new Decimal(item.quantity),
                unitId: item.unitId || null,
                wastePercentage: item.wastePercentage
                  ? new Decimal(item.wastePercentage)
                  : new Decimal(0),
                notes: item.notes || null,
              },
            }),
          ),
        );
      }

      return tx.recipe.findUniqueOrThrow({
        where: { id },
        include: RECIPE_INCLUDE,
      }) as unknown as RecipeWithItems;
    });
  }

  async softDelete(id: string): Promise<Recipe> {
    return this.prisma.recipe.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async deactivateAllForProduct(productId: string): Promise<void> {
    await this.prisma.recipe.updateMany({
      where: { productId, deletedAt: null },
      data: { isActive: false },
    });
  }
}

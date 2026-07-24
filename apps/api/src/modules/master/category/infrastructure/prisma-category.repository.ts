import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ICategoryRepository } from '../domain/category.repository.interface';
import { Category, CategoryTranslation } from '@/generated/client';

@Injectable()
export class PrismaCategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    slug: string;
    icon?: string | null;
    sortOrder?: number;
    isActive?: boolean;
    parentId?: string | null;
    translations: { locale: string; name: string }[];
  }): Promise<Category & { translations: CategoryTranslation[] }> {
    return this.prisma.$transaction(async (tx) => {
      const category = await tx.category.create({
        data: {
          slug: data.slug,
          icon: data.icon,
          sortOrder: data.sortOrder,
          isActive: data.isActive,
          parentId: data.parentId,
        },
      });

      const translations = await Promise.all(
        data.translations.map((t) =>
          tx.categoryTranslation.create({
            data: {
              categoryId: category.id,
              locale: t.locale,
              name: t.name,
            },
          })
        )
      );

      return { ...category, translations };
    });
  }

  async findAll(query?: {
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    parentId?: string | null;
    isActive?: boolean;
  }): Promise<{
    items: (Category & { translations: CategoryTranslation[]; productCount?: number })[];
    total: number;
  }> {
    const page = query?.page || 1;
    const pageSize = query?.pageSize || 10;
    const skip = (page - 1) * pageSize;
    const sortBy = query?.sortBy || 'sortOrder';
    const sortOrder = query?.sortOrder || 'asc';

    const where: any = {
      deletedAt: null,
    };

    if (query?.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query?.parentId !== undefined) {
      where.parentId = query.parentId;
    }

    if (query?.search) {
      where.translations = {
        some: {
          name: { contains: query.search, mode: 'insensitive' },
        },
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: {
          translations: true,
          _count: {
            select: { products: true },
          },
        },
      }),
      this.prisma.category.count({ where }),
    ]);

    const mappedItems = items.map((item) => ({
      ...item,
      productCount: item._count.products,
    }));

    return { items: mappedItems, total };
  }

  async findById(id: string): Promise<(Category & { translations: CategoryTranslation[] }) | null> {
    return this.prisma.category.findFirst({
      where: { id, deletedAt: null },
      include: { translations: true },
    });
  }

  async findBySlug(slug: string): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: { slug, deletedAt: null },
    });
  }

  async update(
    id: string,
    data: {
      slug?: string;
      icon?: string | null;
      sortOrder?: number;
      isActive?: boolean;
      parentId?: string | null;
      translations?: { locale: string; name: string }[];
    }
  ): Promise<Category & { translations: CategoryTranslation[] }> {
    return this.prisma.$transaction(async (tx) => {
      const category = await tx.category.update({
        where: { id },
        data: {
          slug: data.slug,
          icon: data.icon,
          sortOrder: data.sortOrder,
          isActive: data.isActive,
          parentId: data.parentId,
        },
      });

      if (data.translations) {
        // Upsert translations
        await Promise.all(
          data.translations.map((t) =>
            tx.categoryTranslation.upsert({
              where: {
                categoryId_locale: {
                  categoryId: id,
                  locale: t.locale,
                },
              },
              update: { name: t.name },
              create: {
                categoryId: id,
                locale: t.locale,
                name: t.name,
              },
            })
          )
        );
      }

      const translations = await tx.categoryTranslation.findMany({
        where: { categoryId: id },
      });

      return { ...category, translations };
    });
  }

  async softDelete(id: string): Promise<Category> {
    return this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

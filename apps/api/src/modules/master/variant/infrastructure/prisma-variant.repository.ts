import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { IVariantRepository } from '../domain/variant.repository.interface';
import { VariantGroup, VariantGroupTranslation, VariantOption, VariantOptionTranslation } from '@prisma/client';

@Injectable()
export class PrismaVariantRepository implements IVariantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    displayOrder?: number;
    isActive?: boolean;
    translations: { locale: string; name: string }[];
    options: { displayOrder: number; translations: { locale: string; name: string }[] }[];
  }): Promise<VariantGroup & { translations: VariantGroupTranslation[]; options: (VariantOption & { translations: VariantOptionTranslation[] })[] }> {
    return this.prisma.$transaction(async (tx) => {
      const group = await tx.variantGroup.create({
        data: {
          displayOrder: data.displayOrder ?? 0,
          isActive: data.isActive ?? true,
        },
      });

      const translations = await Promise.all(
        data.translations.map((t) =>
          tx.variantGroupTranslation.create({
            data: {
              variantGroupId: group.id,
              locale: t.locale,
              name: t.name,
            },
          })
        )
      );

      const options = await Promise.all(
        data.options.map(async (opt) => {
          const createdOpt = await tx.variantOption.create({
            data: {
              groupId: group.id,
              displayOrder: opt.displayOrder,
            },
          });

          const optTranslations = await Promise.all(
            opt.translations.map((ot) =>
              tx.variantOptionTranslation.create({
                data: {
                  variantOptionId: createdOpt.id,
                  locale: ot.locale,
                  name: ot.name,
                },
              })
            )
          );

          return { ...createdOpt, translations: optTranslations };
        })
      );

      return { ...group, translations, options };
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
    items: (VariantGroup & { translations: VariantGroupTranslation[]; options: (VariantOption & { translations: VariantOptionTranslation[] })[] })[];
    total: number;
  }> {
    const page = query?.page || 1;
    const pageSize = query?.pageSize || 10;
    const skip = (page - 1) * pageSize;
    const sortBy = query?.sortBy || 'displayOrder';
    const sortOrder = query?.sortOrder || 'asc';

    const where: any = {
      deletedAt: null,
    };

    if (query?.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query?.search) {
      where.OR = [
        {
          translations: {
            some: {
              name: { contains: query.search, mode: 'insensitive' },
            },
          },
        },
        {
          options: {
            some: {
              deletedAt: null,
              translations: {
                some: {
                  name: { contains: query.search, mode: 'insensitive' },
                },
              },
            },
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.variantGroup.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: {
          translations: true,
          options: {
            where: { deletedAt: null },
            include: { translations: true },
            orderBy: { displayOrder: 'asc' },
          },
        },
      }),
      this.prisma.variantGroup.count({ where }),
    ]);

    return { items, total };
  }

  async findById(id: string): Promise<(VariantGroup & { translations: VariantGroupTranslation[]; options: (VariantOption & { translations: VariantOptionTranslation[] })[] }) | null> {
    return this.prisma.variantGroup.findFirst({
      where: { id, deletedAt: null },
      include: {
        translations: true,
        options: {
          where: { deletedAt: null },
          include: { translations: true },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
  }

  async update(
    id: string,
    data: {
      displayOrder?: number;
      isActive?: boolean;
      translations?: { locale: string; name: string }[];
      options?: { id?: string; displayOrder: number; translations: { locale: string; name: string }[] }[];
    }
  ): Promise<VariantGroup & { translations: VariantGroupTranslation[]; options: (VariantOption & { translations: VariantOptionTranslation[] })[] }> {
    return this.prisma.$transaction(async (tx) => {
      const group = await tx.variantGroup.update({
        where: { id },
        data: {
          displayOrder: data.displayOrder,
          isActive: data.isActive,
        },
      });

      if (data.translations) {
        await Promise.all(
          data.translations.map((t) =>
            tx.variantGroupTranslation.upsert({
              where: {
                variantGroupId_locale: {
                  variantGroupId: id,
                  locale: t.locale,
                },
              },
              update: { name: t.name },
              create: {
                variantGroupId: id,
                locale: t.locale,
                name: t.name,
              },
            })
          )
        );
      }

      if (data.options) {
        const dbOptions = await tx.variantOption.findMany({
          where: { groupId: id, deletedAt: null },
          select: { id: true },
        });
        const dbOptionIds = dbOptions.map((o) => o.id);

        const incomingOptionIds = data.options
          .map((o) => o.id)
          .filter((oid): oid is string => !!oid);

        const optionIdsToDelete = dbOptionIds.filter((oid) => !incomingOptionIds.includes(oid));

        if (optionIdsToDelete.length > 0) {
          await tx.variantOption.updateMany({
            where: { id: { in: optionIdsToDelete } },
            data: { deletedAt: new Date() },
          });
        }

        for (const opt of data.options) {
          let optId = opt.id;
          if (optId) {
            await tx.variantOption.update({
              where: { id: optId },
              data: { displayOrder: opt.displayOrder },
            });
          } else {
            const newOpt = await tx.variantOption.create({
              data: {
                groupId: id,
                displayOrder: opt.displayOrder,
              },
            });
            optId = newOpt.id;
          }

          for (const t of opt.translations) {
            await tx.variantOptionTranslation.upsert({
              where: {
                variantOptionId_locale: {
                  variantOptionId: optId,
                  locale: t.locale,
                },
              },
              update: { name: t.name },
              create: {
                variantOptionId: optId,
                locale: t.locale,
                name: t.name,
              },
            });
          }
        }
      }

      const translations = await tx.variantGroupTranslation.findMany({
        where: { variantGroupId: id },
      });
      const options = await tx.variantOption.findMany({
        where: { groupId: id, deletedAt: null },
        include: { translations: true },
        orderBy: { displayOrder: 'asc' },
      });

      return { ...group, translations, options };
    });
  }

  async softDelete(id: string): Promise<VariantGroup> {
    return this.prisma.$transaction(async (tx) => {
      // Soft delete all options inside this group
      await tx.variantOption.updateMany({
        where: { groupId: id },
        data: { deletedAt: new Date() },
      });

      // Soft delete group
      return tx.variantGroup.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
  }
}

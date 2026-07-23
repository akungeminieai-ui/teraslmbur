import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { IModifierRepository } from '../domain/modifier.repository.interface';
import { ModifierGroup, ModifierGroupTranslation, ModifierOption, ModifierOptionTranslation } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PrismaModifierRepository implements IModifierRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    isRequired?: boolean;
    minSelect?: number;
    maxSelect?: number;
    displayOrder?: number;
    isActive?: boolean;
    translations: { locale: string; name: string }[];
    options: { displayOrder: number; priceAdjustment: number; translations: { locale: string; name: string }[] }[];
  }): Promise<ModifierGroup & { translations: ModifierGroupTranslation[]; options: (ModifierOption & { translations: ModifierOptionTranslation[] })[] }> {
    return this.prisma.$transaction(async (tx) => {
      const group = await tx.modifierGroup.create({
        data: {
          isRequired: data.isRequired ?? false,
          minSelect: data.minSelect ?? 0,
          maxSelect: data.maxSelect ?? 1,
          displayOrder: data.displayOrder ?? 0,
          isActive: data.isActive ?? true,
        },
      });

      const translations = await Promise.all(
        data.translations.map((t) =>
          tx.modifierGroupTranslation.create({
            data: {
              modifierGroupId: group.id,
              locale: t.locale,
              name: t.name,
            },
          })
        )
      );

      const options = await Promise.all(
        data.options.map(async (opt) => {
          const createdOpt = await tx.modifierOption.create({
            data: {
              groupId: group.id,
              priceAdjustment: new Decimal(opt.priceAdjustment),
              displayOrder: opt.displayOrder,
              isActive: true,
            },
          });

          const optTranslations = await Promise.all(
            opt.translations.map((ot) =>
              tx.modifierOptionTranslation.create({
                data: {
                  modifierOptionId: createdOpt.id,
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
    items: (ModifierGroup & { translations: ModifierGroupTranslation[]; options: (ModifierOption & { translations: ModifierOptionTranslation[] })[] })[];
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
      this.prisma.modifierGroup.findMany({
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
      this.prisma.modifierGroup.count({ where }),
    ]);

    return { items, total };
  }

  async findById(id: string): Promise<(ModifierGroup & { translations: ModifierGroupTranslation[]; options: (ModifierOption & { translations: ModifierOptionTranslation[] })[] }) | null> {
    return this.prisma.modifierGroup.findFirst({
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
      isRequired?: boolean;
      minSelect?: number;
      maxSelect?: number;
      displayOrder?: number;
      isActive?: boolean;
      translations?: { locale: string; name: string }[];
      options?: { id?: string; displayOrder: number; priceAdjustment: number; translations: { locale: string; name: string }[] }[];
    }
  ): Promise<ModifierGroup & { translations: ModifierGroupTranslation[]; options: (ModifierOption & { translations: ModifierOptionTranslation[] })[] }> {
    return this.prisma.$transaction(async (tx) => {
      const group = await tx.modifierGroup.update({
        where: { id },
        data: {
          isRequired: data.isRequired,
          minSelect: data.minSelect,
          maxSelect: data.maxSelect,
          displayOrder: data.displayOrder,
          isActive: data.isActive,
        },
      });

      if (data.translations) {
        await Promise.all(
          data.translations.map((t) =>
            tx.modifierGroupTranslation.upsert({
              where: {
                modifierGroupId_locale: {
                  modifierGroupId: id,
                  locale: t.locale,
                },
              },
              update: { name: t.name },
              create: {
                modifierGroupId: id,
                locale: t.locale,
                name: t.name,
              },
            })
          )
        );
      }

      if (data.options) {
        const dbOptions = await tx.modifierOption.findMany({
          where: { groupId: id, deletedAt: null },
          select: { id: true },
        });
        const dbOptionIds = dbOptions.map((o) => o.id);

        const incomingOptionIds = data.options
          .map((o) => o.id)
          .filter((oid): oid is string => !!oid);

        const optionIdsToDelete = dbOptionIds.filter((oid) => !incomingOptionIds.includes(oid));

        if (optionIdsToDelete.length > 0) {
          await tx.modifierOption.updateMany({
            where: { id: { in: optionIdsToDelete } },
            data: { deletedAt: new Date() },
          });
        }

        for (const opt of data.options) {
          let optId = opt.id;
          if (optId) {
            await tx.modifierOption.update({
              where: { id: optId },
              data: {
                displayOrder: opt.displayOrder,
                priceAdjustment: new Decimal(opt.priceAdjustment),
              },
            });
          } else {
            const newOpt = await tx.modifierOption.create({
              data: {
                groupId: id,
                displayOrder: opt.displayOrder,
                priceAdjustment: new Decimal(opt.priceAdjustment),
                isActive: true,
              },
            });
            optId = newOpt.id;
          }

          for (const t of opt.translations) {
            await tx.modifierOptionTranslation.upsert({
              where: {
                modifierOptionId_locale: {
                  modifierOptionId: optId,
                  locale: t.locale,
                },
              },
              update: { name: t.name },
              create: {
                modifierOptionId: optId,
                locale: t.locale,
                name: t.name,
              },
            });
          }
        }
      }

      const translations = await tx.modifierGroupTranslation.findMany({
        where: { modifierGroupId: id },
      });
      const options = await tx.modifierOption.findMany({
        where: { groupId: id, deletedAt: null },
        include: { translations: true },
        orderBy: { displayOrder: 'asc' },
      });

      return { ...group, translations, options };
    });
  }

  async softDelete(id: string): Promise<ModifierGroup> {
    return this.prisma.$transaction(async (tx) => {
      await tx.modifierOption.updateMany({
        where: { groupId: id },
        data: { deletedAt: new Date() },
      });

      return tx.modifierGroup.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
  }
}

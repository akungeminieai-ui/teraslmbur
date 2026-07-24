import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { IProductRepository } from '../domain/product.repository.interface';
import { Product, ProductTranslation, ProductStatus, ProductAvailability, SalesChannel } from '@/generated/client';
import { Decimal } from '@/generated/client/runtime/library';

@Injectable()
export class PrismaProductRepository implements IProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    slug: string;
    sku?: string | null;
    barcode?: string | null;
    sellingPrice: number | string;
    status?: ProductStatus;
    availabilityStatus?: ProductAvailability;
    preparationTime?: number;
    isFeatured?: boolean;
    currentHpp?: number | string;
    categoryId: string;
    translations: { locale: string; name: string; description?: string | null }[];
    stationIds?: string[];
    salesChannels?: SalesChannel[];
    availabilitySchedules?: { dayOfWeek: number; startTime: string; endTime: string }[];
    nutrition?: { calories?: number | null; protein?: number | string | null; fat?: number | string | null; sugar?: number | string | null; allergens?: string[] };
    tags?: string[];
    attributes?: { name: string; value: string }[];
    media?: { mediaId: string; sortOrder: number; isPrimary: boolean }[];
    variants?: { optionId: string; priceAdjustment: number; sku?: string | null }[];
    modifierGroupIds?: string[];
  }): Promise<Product & { translations: ProductTranslation[] }> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Create base product
      const product = await tx.product.create({
        data: {
          slug: data.slug,
          sku: data.sku,
          barcode: data.barcode,
          sellingPrice: new Decimal(data.sellingPrice),
          status: data.status,
          availabilityStatus: data.availabilityStatus,
          preparationTime: data.preparationTime,
          isFeatured: data.isFeatured,
          currentHpp: new Decimal(data.currentHpp || 0.0),
          categoryId: data.categoryId,
        },
      });

      // 2. Create translations
      const translations = await Promise.all(
        data.translations.map((t) =>
          tx.productTranslation.create({
            data: {
              productId: product.id,
              locale: t.locale,
              name: t.name,
              description: t.description,
            },
          })
        )
      );

      // 3. Create station assignments
      if (data.stationIds) {
        await Promise.all(
          data.stationIds.map((stationId, index) =>
            tx.kitchenStationAssignment.create({
              data: {
                productId: product.id,
                kitchenStationId: stationId,
                isPrimary: index === 0,
              },
            })
          )
        );
      }

      // 4. Create sales channels
      if (data.salesChannels) {
        await Promise.all(
          data.salesChannels.map((channel) =>
            tx.productSalesChannel.create({
              data: {
                productId: product.id,
                channel,
              },
            })
          )
        );
      }

      // 5. Create availability schedules
      if (data.availabilitySchedules) {
        await Promise.all(
          data.availabilitySchedules.map((schedule) =>
            tx.productAvailabilitySchedule.create({
              data: {
                productId: product.id,
                dayOfWeek: schedule.dayOfWeek,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
              },
            })
          )
        );
      }

      // 6. Create nutrition profile
      if (data.nutrition) {
        await tx.productNutrition.create({
          data: {
            productId: product.id,
            calories: data.nutrition.calories,
            protein: data.nutrition.protein ? new Decimal(data.nutrition.protein) : null,
            fat: data.nutrition.fat ? new Decimal(data.nutrition.fat) : null,
            sugar: data.nutrition.sugar ? new Decimal(data.nutrition.sugar) : null,
            allergens: data.nutrition.allergens || [],
          },
        });
      }

      // 7. Create tags
      if (data.tags) {
        for (const tagName of data.tags) {
          const tag = await tx.tag.upsert({
            where: { name: tagName },
            update: {},
            create: { name: tagName },
          });
          await tx.productTag.create({
            data: {
              productId: product.id,
              tagId: tag.id,
            },
          });
        }
      }

      // 8. Create attributes
      if (data.attributes) {
        await Promise.all(
          data.attributes.map((attr) =>
            tx.productAttribute.create({
              data: {
                productId: product.id,
                name: attr.name,
                value: attr.value,
              },
            })
          )
        );
      }

      // 9. Create media relations
      if (data.media) {
        await Promise.all(
          data.media.map((med) =>
            tx.productMedia.create({
              data: {
                productId: product.id,
                mediaId: med.mediaId,
                sortOrder: med.sortOrder,
                isPrimary: med.isPrimary,
              },
            })
          )
        );
      }

      // 10. Create variant assignments
      if (data.variants) {
        await Promise.all(
          data.variants.map((v) =>
            tx.productVariant.create({
              data: {
                productId: product.id,
                optionId: v.optionId,
                priceAdjustment: new Decimal(v.priceAdjustment || 0),
                sku: v.sku || null,
              },
            })
          )
        );
      }

      // 10b. Create modifier assignments
      if (data.modifierGroupIds) {
        await Promise.all(
          data.modifierGroupIds.map((modifierGroupId) =>
            tx.productModifier.create({
              data: {
                productId: product.id,
                modifierGroupId,
              },
            })
          )
        );
      }

      // 11. Record initial price history
      await tx.productPriceHistory.create({
        data: {
          productId: product.id,
          sellingPrice: new Decimal(data.sellingPrice),
          currentHpp: new Decimal(data.currentHpp || 0.0),
          reason: 'Initial price configuration',
        },
      });

      return { ...product, translations };
    });
  }

  async findAll(query?: {
    search?: string;
    categoryId?: string;
    stationId?: string;
    status?: ProductStatus;
    salesChannel?: SalesChannel;
    isFeatured?: boolean;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ items: any[]; total: number }> {
    const page = query?.page || 1;
    const pageSize = query?.pageSize || 10;
    const skip = (page - 1) * pageSize;
    const sortBy = query?.sortBy || 'createdAt';
    const sortOrder = query?.sortOrder || 'desc';

    const where: any = {
      deletedAt: null,
    };

    if (query?.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query?.status) {
      where.status = query.status;
    }

    if (query?.isFeatured !== undefined) {
      where.isFeatured = query.isFeatured;
    }

    if (query?.salesChannel) {
      where.salesChannels = {
        some: { channel: query.salesChannel },
      };
    }

    if (query?.stationId) {
      where.stationAssignments = {
        some: { kitchenStationId: query.stationId },
      };
    }

    if (query?.search) {
      where.OR = [
        { sku: { contains: query.search, mode: 'insensitive' } },
        { barcode: { contains: query.search, mode: 'insensitive' } },
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
      this.prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: {
          translations: true,
          category: {
            include: { translations: true },
          },
          stationAssignments: {
            include: { kitchenStation: true },
          },
          media: {
            include: { media: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total };
  }

  async findById(id: string): Promise<any | null> {
    return this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: {
        translations: true,
        category: true,
        stationAssignments: {
          include: { kitchenStation: true },
        },
        salesChannels: true,
        availabilitySchedules: true,
        nutrition: true,
        tags: {
          include: { tag: true },
        },
        attributes: true,
        media: {
          include: { media: true },
          orderBy: { sortOrder: 'asc' },
        },
        variants: {
          where: { deletedAt: null },
          include: {
            option: {
              include: {
                translations: true,
                group: {
                  include: { translations: true },
                },
              },
            },
          },
        },
        modifiers: {
          include: {
            group: {
              include: {
                translations: true,
                options: {
                  where: { deletedAt: null },
                  include: { translations: true },
                },
              },
            },
          },
        },
      },
    });
  }

  async findBySlug(slug: string): Promise<Product | null> {
    return this.prisma.product.findFirst({
      where: { slug, deletedAt: null },
    });
  }

  async findBySku(sku: string): Promise<Product | null> {
    return this.prisma.product.findFirst({
      where: { sku, deletedAt: null },
    });
  }

  async findByBarcode(barcode: string): Promise<Product | null> {
    return this.prisma.product.findFirst({
      where: { barcode, deletedAt: null },
    });
  }

  async update(
    id: string,
    data: {
      slug?: string;
      sku?: string | null;
      barcode?: string | null;
      sellingPrice?: number | string;
      status?: ProductStatus;
      availabilityStatus?: ProductAvailability;
      preparationTime?: number;
      isFeatured?: boolean;
      currentHpp?: number | string;
      categoryId?: string;
      translations?: { locale: string; name: string; description?: string | null }[];
      stationIds?: string[];
      salesChannels?: SalesChannel[];
      availabilitySchedules?: { dayOfWeek: number; startTime: string; endTime: string }[];
      nutrition?: { calories?: number | null; protein?: number | string | null; fat?: number | string | null; sugar?: number | string | null; allergens?: string[] };
      tags?: string[];
      attributes?: { name: string; value: string }[];
      media?: { mediaId: string; sortOrder: number; isPrimary: boolean }[];
      variants?: { optionId: string; priceAdjustment: number; sku?: string | null }[];
      modifierGroupIds?: string[];
    },
    priceHistoryContext?: { changedById?: string | null; reason?: string | null }
  ): Promise<Product & { translations: ProductTranslation[] }> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch current product price to check for updates
      const currentProduct = await tx.product.findUnique({
        where: { id },
      });

      if (!currentProduct) {
        throw new Error('Product not found');
      }

      // 2. Perform price change logging if price differs
      if (data.sellingPrice !== undefined) {
        const oldPrice = new Decimal(currentProduct.sellingPrice);
        const newPrice = new Decimal(data.sellingPrice);

        if (!oldPrice.equals(newPrice)) {
          await tx.productPriceHistory.create({
            data: {
              productId: id,
              sellingPrice: newPrice,
              currentHpp: data.currentHpp ? new Decimal(data.currentHpp) : currentProduct.currentHpp,
              changedById: priceHistoryContext?.changedById || null,
              reason: priceHistoryContext?.reason || 'Price updated',
            },
          });
        }
      }

      // 3. Update base product
      const product = await tx.product.update({
        where: { id },
        data: {
          slug: data.slug,
          sku: data.sku,
          barcode: data.barcode,
          sellingPrice: data.sellingPrice ? new Decimal(data.sellingPrice) : undefined,
          status: data.status,
          availabilityStatus: data.availabilityStatus,
          preparationTime: data.preparationTime,
          isFeatured: data.isFeatured,
          currentHpp: data.currentHpp ? new Decimal(data.currentHpp) : undefined,
          categoryId: data.categoryId,
        },
      });

      // 4. Update translations
      if (data.translations) {
        await Promise.all(
          data.translations.map((t) =>
            tx.productTranslation.upsert({
              where: {
                productId_locale: {
                  productId: id,
                  locale: t.locale,
                },
              },
              update: { name: t.name, description: t.description },
              create: {
                productId: id,
                locale: t.locale,
                name: t.name,
                description: t.description,
              },
            })
          )
        );
      }

      // 5. Update station assignments (Clear & Create)
      if (data.stationIds) {
        await tx.kitchenStationAssignment.deleteMany({
          where: { productId: id },
        });

        await Promise.all(
          data.stationIds.map((stationId, index) =>
            tx.kitchenStationAssignment.create({
              data: {
                productId: id,
                kitchenStationId: stationId,
                isPrimary: index === 0,
              },
            })
          )
        );
      }

      // 6. Update sales channels (Clear & Create)
      if (data.salesChannels) {
        await tx.productSalesChannel.deleteMany({
          where: { productId: id },
        });

        await Promise.all(
          data.salesChannels.map((channel) =>
            tx.productSalesChannel.create({
              data: {
                productId: id,
                channel,
              },
            })
          )
        );
      }

      // 7. Update availability schedules (Clear & Create)
      if (data.availabilitySchedules) {
        await tx.productAvailabilitySchedule.deleteMany({
          where: { productId: id },
        });

        await Promise.all(
          data.availabilitySchedules.map((schedule) =>
            tx.productAvailabilitySchedule.create({
              data: {
                productId: id,
                dayOfWeek: schedule.dayOfWeek,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
              },
            })
          )
        );
      }

      // 8. Update nutrition profile
      if (data.nutrition) {
        await tx.productNutrition.upsert({
          where: { productId: id },
          update: {
            calories: data.nutrition.calories,
            protein: data.nutrition.protein ? new Decimal(data.nutrition.protein) : null,
            fat: data.nutrition.fat ? new Decimal(data.nutrition.fat) : null,
            sugar: data.nutrition.sugar ? new Decimal(data.nutrition.sugar) : null,
            allergens: data.nutrition.allergens || [],
          },
          create: {
            productId: id,
            calories: data.nutrition.calories,
            protein: data.nutrition.protein ? new Decimal(data.nutrition.protein) : null,
            fat: data.nutrition.fat ? new Decimal(data.nutrition.fat) : null,
            sugar: data.nutrition.sugar ? new Decimal(data.nutrition.sugar) : null,
            allergens: data.nutrition.allergens || [],
          },
        });
      }

      // 9. Update tags (Clear & Create)
      if (data.tags) {
        await tx.productTag.deleteMany({
          where: { productId: id },
        });

        for (const tagName of data.tags) {
          const tag = await tx.tag.upsert({
            where: { name: tagName },
            update: {},
            create: { name: tagName },
          });
          await tx.productTag.create({
            data: {
              productId: id,
              tagId: tag.id,
            },
          });
        }
      }

      // 10. Update attributes (Clear & Create)
      if (data.attributes) {
        await tx.productAttribute.deleteMany({
          where: { productId: id },
        });

        await Promise.all(
          data.attributes.map((attr) =>
            tx.productAttribute.create({
              data: {
                productId: id,
                name: attr.name,
                value: attr.value,
              },
            })
          )
        );
      }

      // 11. Update media (Clear & Create)
      if (data.media) {
        await tx.productMedia.deleteMany({
          where: { productId: id },
        });

        await Promise.all(
          data.media.map((med) =>
            tx.productMedia.create({
              data: {
                productId: id,
                mediaId: med.mediaId,
                sortOrder: med.sortOrder,
                isPrimary: med.isPrimary,
              },
            })
          )
        );
      }

      // 12. Update variant assignments (Clear & Create)
      if (data.variants) {
        await tx.productVariant.deleteMany({
          where: { productId: id },
        });

        await Promise.all(
          data.variants.map((v) =>
            tx.productVariant.create({
              data: {
                productId: id,
                optionId: v.optionId,
                priceAdjustment: new Decimal(v.priceAdjustment || 0),
                sku: v.sku || null,
              },
            })
          )
        );
      }

      // 12b. Update modifier assignments (Clear & Create)
      if (data.modifierGroupIds) {
        await tx.productModifier.deleteMany({
          where: { productId: id },
        });

        await Promise.all(
          data.modifierGroupIds.map((modifierGroupId) =>
            tx.productModifier.create({
              data: {
                productId: id,
                modifierGroupId,
              },
            })
          )
        );
      }

      const translations = await tx.productTranslation.findMany({
        where: { productId: id },
      });

      return { ...product, translations };
    });
  }

  async softDelete(id: string): Promise<Product> {
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: string): Promise<Product> {
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  async findPriceHistory(
    productId: string,
    query?: { page?: number; pageSize?: number }
  ): Promise<{ items: any[]; total: number }> {
    const page = query?.page || 1;
    const pageSize = query?.pageSize || 10;
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.productPriceHistory.findMany({
        where: { productId },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          changedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      this.prisma.productPriceHistory.count({
        where: { productId },
      }),
    ]);

    return { items, total };
  }
}

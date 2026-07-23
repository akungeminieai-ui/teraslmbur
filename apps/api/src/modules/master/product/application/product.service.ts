import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaProductRepository } from '../infrastructure/prisma-product.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '../../../system/audit/audit.service';
import { EventBusService } from '../../../system/event-bus/event-bus.service';
import { BaseDomainEvent } from '../../../system/event-bus/base-domain-event';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductTranslation, ProductStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ProductService {
  constructor(
    private readonly productRepository: PrismaProductRepository,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventBus: EventBusService
  ) {}

  private slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');
  }

  private async generateSku(categoryId: string): Promise<string> {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException(`Category with ID '${categoryId}' not found`);
    }

    const categoryCode = category.slug.toUpperCase();
    const prefix = `TL-${categoryCode}-`;

    const lastProduct = await this.prisma.product.findFirst({
      where: { sku: { startsWith: prefix } },
      orderBy: { sku: 'desc' },
    });

    let sequence = 1;
    if (lastProduct && typeof lastProduct.sku === 'string') {
      const parts = lastProduct.sku.split('-');
      const lastPart = parts[parts.length - 1];
      if (lastPart) {
        const lastNum = parseInt(lastPart, 10);
        if (!isNaN(lastNum)) {
          sequence = lastNum + 1;
        }
      }
    }

    return `${prefix}${String(sequence).padStart(6, '0')}`;
  }

  async create(dto: CreateProductDto, _contextUser?: { id: string }): Promise<Product & { translations: ProductTranslation[] }> {
    // 1. Resolve slug
    let slug = dto.slug ? this.slugify(dto.slug) : '';
    if (!slug) {
      const englishTranslation = dto.translations.find((t) => t.locale === 'en') || dto.translations[0];
      slug = this.slugify(englishTranslation?.name || 'product');
    }

    // Verify slug uniqueness
    let existingSlug = await this.productRepository.findBySlug(slug);
    let attempts = 0;
    while (existingSlug && attempts < 10) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
      existingSlug = await this.productRepository.findBySlug(slug);
      attempts++;
    }

    // 2. Resolve SKU
    const sku: string = dto.sku || (await this.generateSku(dto.categoryId));

    // Verify SKU uniqueness
    const existingSku = await this.productRepository.findBySku(sku);
    let finalSku = sku;
    if (existingSku) {
      finalSku = `${sku}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // 3. Verify Barcode uniqueness if provided
    if (dto.barcode) {
      const existingBarcode = await this.productRepository.findByBarcode(dto.barcode);
      if (existingBarcode) {
        throw new BadRequestException(`Product with Barcode '${dto.barcode}' already exists`);
      }
    }

    // 4. Create product
    const product = await this.productRepository.create({
      ...dto,
      slug,
      sku: finalSku,
      status: dto.status || ProductStatus.DRAFT,
      currentHpp: 0.0,
      media: dto.media?.map((m) => ({
        mediaId: m.mediaId,
        sortOrder: m.sortOrder || 0,
        isPrimary: m.isPrimary || false,
      })),
    });

    // 5. Audit Log
    await this.auditService.log({
      action: 'product.create',
      resource: 'Product',
      resourceId: product.id,
      newValue: product,
    });

    // 6. Publish Event
    this.eventBus.publish(
      new BaseDomainEvent('product.created', product.id, 'Product', {
        id: product.id,
        sku: product.sku,
        translations: product.translations,
      })
    );

    return product;
  }

  async findAll(query?: {
    search?: string;
    categoryId?: string;
    stationId?: string;
    status?: ProductStatus;
    salesChannel?: any;
    isFeatured?: boolean;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ items: any[]; total: number }> {
    return this.productRepository.findAll(query);
  }

  async findOne(id: string): Promise<any> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }
    return product;
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    contextUser?: { id: string }
  ): Promise<Product & { translations: ProductTranslation[] }> {
    const product = await this.findOne(id);
    const oldValue = { ...product };

    // Resolve slug updates
    let slug = dto.slug ? this.slugify(dto.slug) : undefined;
    if (slug && slug !== product.slug) {
      const existingSlug = await this.productRepository.findBySlug(slug);
      if (existingSlug) {
        throw new BadRequestException(`Product with slug '${slug}' already exists`);
      }
    }

    // Resolve SKU updates
    if (dto.sku && dto.sku !== product.sku) {
      const existingSku = await this.productRepository.findBySku(dto.sku);
      if (existingSku) {
        throw new BadRequestException(`Product with SKU '${dto.sku}' already exists`);
      }
    }

    // Resolve Barcode updates
    if (dto.barcode && dto.barcode !== product.barcode) {
      const existingBarcode = await this.productRepository.findByBarcode(dto.barcode);
      if (existingBarcode) {
        throw new BadRequestException(`Product with Barcode '${dto.barcode}' already exists`);
      }
    }

    const updatedProduct = await this.productRepository.update(
      id,
      {
        ...dto,
        media: dto.media?.map((m) => ({
          mediaId: m.mediaId,
          sortOrder: m.sortOrder || 0,
          isPrimary: m.isPrimary || false,
        })),
      },
      {
        changedById: contextUser?.id,
        reason: dto.priceChangeReason,
      }
    );

    // Write Audit Log
    await this.auditService.log({
      action: 'product.update',
      resource: 'Product',
      resourceId: id,
      oldValue,
      newValue: updatedProduct,
    });

    // Publish Event
    this.eventBus.publish(
      new BaseDomainEvent('product.updated', id, 'Product', {
        id,
        sku: updatedProduct.sku,
        translations: updatedProduct.translations,
      })
    );

    // Price change event detection
    if (dto.sellingPrice !== undefined) {
      const oldPrice = new Decimal(product.sellingPrice);
      const newPrice = new Decimal(dto.sellingPrice);
      if (!oldPrice.equals(newPrice)) {
        this.eventBus.publish(
          new BaseDomainEvent('product.price_changed', id, 'Product', {
            id,
            oldPrice: oldPrice.toNumber(),
            newPrice: newPrice.toNumber(),
            reason: dto.priceChangeReason || 'Selling price update',
            changedBy: contextUser?.id || 'system',
          })
        );
      }
    }

    // Status change event detection
    if (dto.status !== undefined && dto.status !== product.status) {
      this.eventBus.publish(
        new BaseDomainEvent('product.status_changed', id, 'Product', {
          id,
          oldStatus: product.status,
          newStatus: dto.status,
        })
      );
    }

    return updatedProduct;
  }

  async remove(id: string, reason?: string, _contextUser?: { id: string }): Promise<void> {
    const product = await this.findOne(id);
    const oldValue = { ...product };

    await this.productRepository.softDelete(id);

    // Audit Log
    await this.auditService.log({
      action: 'product.delete',
      resource: 'Product',
      resourceId: id,
      oldValue,
      reason,
    });

    // Publish Event
    this.eventBus.publish(
      new BaseDomainEvent('product.deleted', id, 'Product', {
        id,
        sku: product.sku,
      })
    );
  }

  async restore(id: string, _contextUser?: { id: string }): Promise<Product> {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    const restoredProduct = await this.productRepository.restore(id);

    // Audit Log
    await this.auditService.log({
      action: 'product.restore',
      resource: 'Product',
      resourceId: id,
      newValue: restoredProduct,
    });

    return restoredProduct;
  }

  async archive(id: string, _contextUser?: { id: string }): Promise<Product> {
    return this.update(id, { status: ProductStatus.ARCHIVED }, _contextUser);
  }

  async duplicate(id: string, _contextUser?: { id: string }): Promise<any> {
    const sourceProduct = await this.findOne(id);

    // 1. Generate unique SKU & Slug for copy
    const newSku = await this.generateSku(sourceProduct.categoryId);
    let newSlug = `${sourceProduct.slug}-copy`;
    let existingSlug = await this.productRepository.findBySlug(newSlug);
    let attempts = 0;
    while (existingSlug && attempts < 10) {
      newSlug = `${newSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
      existingSlug = await this.productRepository.findBySlug(newSlug);
      attempts++;
    }

    // 2. Prepare translations (append (Copy) to names)
    const translations = sourceProduct.translations.map((t: any) => ({
      locale: t.locale,
      name: t.locale === 'en' ? `${t.name} (Copy)` : `${t.name} (Salinan)`,
      description: t.description,
    }));

    // 3. Map relations safely
    const stationIds = sourceProduct.stationAssignments?.map((s: any) => s.kitchenStationId) || [];
    const salesChannels = sourceProduct.salesChannels?.map((sc: any) => sc.channel) || [];
    const availabilitySchedules = sourceProduct.availabilitySchedules?.map((as: any) => ({
      dayOfWeek: as.dayOfWeek,
      startTime: as.startTime,
      endTime: as.endTime,
    })) || [];

    const nutrition = sourceProduct.nutrition
      ? {
          calories: sourceProduct.nutrition.calories,
          protein: sourceProduct.nutrition.protein?.toNumber(),
          fat: sourceProduct.nutrition.fat?.toNumber(),
          sugar: sourceProduct.nutrition.sugar?.toNumber(),
          allergens: sourceProduct.nutrition.allergens,
        }
      : undefined;

    const tags = sourceProduct.tags?.map((t: any) => t.tag.name) || [];
    const attributes = sourceProduct.attributes?.map((attr: any) => ({
      name: attr.name,
      value: attr.value,
    })) || [];

    const media = sourceProduct.media?.map((m: any) => ({
      mediaId: m.mediaId,
      sortOrder: m.sortOrder,
      isPrimary: m.isPrimary,
    })) || [];

    // 4. Create duplicated product (forces draft status by default)
    const duplicated = await this.productRepository.create({
      slug: newSlug,
      sku: newSku,
      barcode: null,
      sellingPrice: sourceProduct.sellingPrice.toNumber(),
      status: ProductStatus.DRAFT,
      availabilityStatus: sourceProduct.availabilityStatus,
      preparationTime: sourceProduct.preparationTime,
      isFeatured: sourceProduct.isFeatured,
      categoryId: sourceProduct.categoryId,
      translations,
      stationIds,
      salesChannels,
      availabilitySchedules,
      nutrition,
      tags,
      attributes,
      media,
    });

    // 5. Audit Log
    await this.auditService.log({
      action: 'product.duplicate',
      resource: 'Product',
      resourceId: duplicated.id,
      newValue: duplicated,
    });

    // 6. Publish Event
    this.eventBus.publish(
      new BaseDomainEvent('product.duplicated', duplicated.id, 'Product', {
        id: duplicated.id,
        sku: duplicated.sku,
        translations: duplicated.translations,
      })
    );

    return duplicated;
  }

  async findPriceHistory(
    productId: string,
    query?: { page?: number; pageSize?: number }
  ): Promise<{ items: any[]; total: number }> {
    return this.productRepository.findPriceHistory(productId, query);
  }

  async bulkUpdateStatus(ids: string[], status: ProductStatus, _contextUser?: { id: string }): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await Promise.all(
        ids.map(async (id) => {
          await tx.product.update({
            where: { id },
            data: { status },
          });

          await this.auditService.log({
            action: 'product.update_status',
            resource: 'Product',
            resourceId: id,
            newValue: { status },
          });

          this.eventBus.publish(
            new BaseDomainEvent('product.status_changed', id, 'Product', {
              id,
              newStatus: status,
            })
          );
        })
      );
    });
  }
}

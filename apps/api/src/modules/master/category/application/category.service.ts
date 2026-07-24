import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaCategoryRepository } from '../infrastructure/prisma-category.repository';
import { AuditService } from '../../../system/audit/audit.service';
import { EventBusService } from '../../../system/event-bus/event-bus.service';
import { BaseDomainEvent } from '../../../system/event-bus/base-domain-event';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category, CategoryTranslation } from '@/generated/client';

@Injectable()
export class CategoryService {
  constructor(
    private readonly categoryRepository: PrismaCategoryRepository,
    private readonly auditService: AuditService,
    private readonly eventBus: EventBusService,
  ) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async create(dto: CreateCategoryDto): Promise<Category & { translations: CategoryTranslation[] }> {
    // Determine slug
    let slug = dto.slug;
    if (!slug) {
      const englishTranslation = dto.translations.find((t) => t.locale === 'en') || dto.translations[0];
      if (!englishTranslation) {
        throw new BadRequestException('At least one translation is required');
      }
      slug = this.generateSlug(englishTranslation.name);
    }

    // Verify slug uniqueness
    const existingSlug = await this.categoryRepository.findBySlug(slug);
    if (existingSlug) {
      // Append a random string or counter if slug exists
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Validate hierarchy parent
    if (dto.parentId) {
      const parent = await this.categoryRepository.findById(dto.parentId);
      if (!parent) {
        throw new NotFoundException(`Parent category with ID '${dto.parentId}' not found`);
      }
      if (parent.parentId) {
        throw new BadRequestException('Nesting limit reached: parent category cannot be a subcategory');
      }
    }

    const category = await this.categoryRepository.create({
      ...dto,
      slug,
    });

    // Write Audit Log
    await this.auditService.log({
      action: 'category.create',
      resource: 'Category',
      resourceId: category.id,
      newValue: category,
    });

    // Publish Event
    this.eventBus.publish(
      new BaseDomainEvent('category.created', category.id, 'Category', {
        id: category.id,
        slug: category.slug,
        translations: category.translations,
      })
    );

    return category;
  }

  async findAll(query?: {
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    parentId?: string | null;
    isActive?: boolean;
  }): Promise<{ items: (Category & { translations: CategoryTranslation[]; productCount?: number })[]; total: number }> {
    return this.categoryRepository.findAll(query);
  }

  async findOne(id: string): Promise<Category & { translations: CategoryTranslation[] }> {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category & { translations: CategoryTranslation[] }> {
    const category = await this.findOne(id);
    const oldValue = { ...category };

    // Validate parent hierarchy if updating parent
    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('A category cannot be its own parent');
      }

      const parent = await this.categoryRepository.findById(dto.parentId);
      if (!parent) {
        throw new NotFoundException(`Parent category with ID '${dto.parentId}' not found`);
      }
      if (parent.parentId) {
        throw new BadRequestException('Nesting limit reached: parent category cannot be a subcategory');
      }

      // Verify category has no subcategories (no level-3 nested descendants)
      const children = await this.categoryRepository.findAll({ parentId: id });
      if (children.total > 0) {
        throw new BadRequestException('Cannot nest this category: it contains subcategories');
      }
    }

    let slug = dto.slug;
    if (slug && slug !== category.slug) {
      const existingSlug = await this.categoryRepository.findBySlug(slug);
      if (existingSlug) {
        throw new BadRequestException(`Category with slug '${slug}' already exists`);
      }
    }

    const updatedCategory = await this.categoryRepository.update(id, dto);

    // Write Audit Log
    await this.auditService.log({
      action: 'category.update',
      resource: 'Category',
      resourceId: id,
      oldValue,
      newValue: updatedCategory,
    });

    // Publish Event
    this.eventBus.publish(
      new BaseDomainEvent('category.updated', id, 'Category', {
        id,
        slug: updatedCategory.slug,
        translations: updatedCategory.translations,
      })
    );

    return updatedCategory;
  }

  async remove(id: string, reason?: string): Promise<void> {
    const category = await this.findOne(id);
    const oldValue = { ...category };

    // Prevent deletion if category contains subcategories
    const children = await this.categoryRepository.findAll({ parentId: id });
    if (children.total > 0) {
      throw new BadRequestException('Cannot delete category containing active subcategories');
    }

    // Soft delete
    await this.categoryRepository.softDelete(id);

    // Write Audit Log
    await this.auditService.log({
      action: 'category.delete',
      resource: 'Category',
      resourceId: id,
      oldValue,
      reason,
    });

    // Publish Event
    this.eventBus.publish(
      new BaseDomainEvent('category.deleted', id, 'Category', {
        id,
        slug: category.slug,
      })
    );
  }

  async duplicate(id: string): Promise<Category & { translations: CategoryTranslation[] }> {
    const source = await this.findOne(id);

    const translations = source.translations.map((t) => ({
      locale: t.locale,
      name: `${t.name} (Copy)`,
    }));

    let targetSlug = `${source.slug}-copy`;
    const existingSlug = await this.categoryRepository.findBySlug(targetSlug);
    if (existingSlug) {
      targetSlug = `${targetSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const duplicated = await this.categoryRepository.create({
      slug: targetSlug,
      icon: source.icon,
      sortOrder: source.sortOrder,
      isActive: false,
      parentId: source.parentId,
      translations,
    });

    // Write Audit Log
    await this.auditService.log({
      action: 'category.duplicate',
      resource: 'Category',
      resourceId: duplicated.id,
      oldValue: source,
      newValue: duplicated,
    });

    // Publish Event
    this.eventBus.publish(
      new BaseDomainEvent('category.duplicated', duplicated.id, 'Category', {
        id: duplicated.id,
        slug: duplicated.slug,
        translations: duplicated.translations,
      })
    );

    return duplicated;
  }
}

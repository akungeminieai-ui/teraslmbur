import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaRecipeRepository } from '../infrastructure/prisma-recipe.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '../../../system/audit/audit.service';
import { EventBusService } from '../../../system/event-bus/event-bus.service';
import { BaseDomainEvent } from '../../../system/event-bus/base-domain-event';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { RecipeWithItems } from '../domain/recipe.repository.interface';
import { Decimal } from '@/generated/client/runtime/library';

@Injectable()
export class RecipeService {
  constructor(
    private readonly recipeRepository: PrismaRecipeRepository,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventBus: EventBusService,
  ) {}

  private getUnitConversionFactor(fromAbbr: string, toAbbr: string): number {
    const from = (fromAbbr || '').toLowerCase();
    const to = (toAbbr || '').toLowerCase();
    if (from === to || !from || !to) return 1;

    // Weight conversions
    if (from === 'g' && to === 'kg') return 0.001;
    if (from === 'kg' && to === 'g') return 1000;

    // Volume conversions
    if (from === 'ml' && to === 'l') return 0.001;
    if (from === 'l' && to === 'ml') return 1000;

    return 1;
  }

  /**
   * Calculates total HPP for a set of recipe items.
   * HPP = Σ(ingredient.costPerUnit × quantity)
   */
  private calculateHpp(
    items: RecipeWithItems['items'],
  ): Decimal {
    let total = new Decimal(0);

    for (const item of items) {
      const costPerUnit = new Decimal(item.ingredient.costPerUnit);
      let quantity = new Decimal(item.quantity);

      if (item.unit && item.ingredient.inventoryUnit) {
        const factor = this.getUnitConversionFactor(
          item.unit.abbreviation,
          item.ingredient.inventoryUnit.abbreviation,
        );
        quantity = quantity.mul(factor);
      }

      // Line cost = costPerUnit × quantity
      const lineCost = costPerUnit.mul(quantity);
      total = total.add(lineCost);
    }

    return total;
  }

  /**
   * Updates Product.currentHpp based on the active recipe.
   * If no active recipe exists, resets to 0.
   */
  private async syncProductHpp(productId: string): Promise<Decimal> {
    const activeRecipe = await this.recipeRepository.findActiveByProductId(productId);

    let hpp = new Decimal(0);
    if (activeRecipe && activeRecipe.items.length > 0) {
      hpp = this.calculateHpp(activeRecipe.items);
    }

    await this.prisma.product.update({
      where: { id: productId },
      data: { currentHpp: hpp },
    });

    this.eventBus.publish(
      new BaseDomainEvent('product.hpp_updated', productId, 'Product', {
        productId,
        currentHpp: hpp.toNumber(),
      }),
    );

    return hpp;
  }

  async create(
    productId: string,
    dto: CreateRecipeDto,
  ): Promise<RecipeWithItems> {
    // 1. Verify product exists
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID '${productId}' not found`);
    }

    // 2. Validate all ingredients exist and are active
    const ingredientIds = dto.items.map((i) => i.ingredientId);
    const ingredients = await this.prisma.ingredient.findMany({
      where: { id: { in: ingredientIds }, deletedAt: null },
    });

    if (ingredients.length !== ingredientIds.length) {
      const foundIds = new Set(ingredients.map((i) => i.id));
      const missing = ingredientIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(`Ingredients not found: ${missing.join(', ')}`);
    }

    const inactiveIngredients = ingredients.filter((i) => !i.isActive);
    if (inactiveIngredients.length > 0) {
      throw new BadRequestException(
        `Inactive ingredients cannot be used: ${inactiveIngredients.map((i) => i.id).join(', ')}`,
      );
    }

    // 3. Get next version
    const maxVersion = await this.recipeRepository.getMaxVersion(productId);
    const version = maxVersion + 1;

    // 4. If isActive, deactivate all other recipes for this product
    if (dto.isActive !== false) {
      await this.recipeRepository.deactivateAllForProduct(productId);
    }

    // 5. Create recipe
    const recipe = await this.recipeRepository.create({
      productId,
      version,
      notes: dto.notes,
      isActive: dto.isActive ?? true,
      items: dto.items.map((item) => ({
        ingredientId: item.ingredientId,
        quantity: item.quantity,
        unitId: item.unitId,
        wastePercentage: item.wastePercentage,
        notes: item.notes,
      })),
    });

    // 6. Sync Product.currentHpp if active
    if (recipe.isActive) {
      await this.syncProductHpp(productId);
    }

    // 7. Audit Log
    await this.auditService.log({
      action: 'recipe.created',
      resource: 'Recipe',
      resourceId: recipe.id,
      newValue: {
        id: recipe.id,
        productId,
        version,
        itemCount: recipe.items.length,
        items: recipe.items.map((i) => ({
          ingredientId: i.ingredientId,
          quantity: i.quantity.toString(),
        })),
      },
    });

    // 8. Publish Events
    this.eventBus.publish(
      new BaseDomainEvent('recipe.created', recipe.id, 'Recipe', {
        id: recipe.id,
        productId,
        version,
        isActive: recipe.isActive,
      }),
    );

    return recipe;
  }

  async findAll(query?: {
    productId?: string;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ items: RecipeWithItems[]; total: number }> {
    return this.recipeRepository.findAll(query);
  }

  async findOne(id: string): Promise<RecipeWithItems> {
    const recipe = await this.recipeRepository.findById(id);
    if (!recipe) {
      throw new NotFoundException(`Recipe with ID '${id}' not found`);
    }
    return recipe;
  }

  async findActiveByProductId(productId: string): Promise<RecipeWithItems | null> {
    // Verify product exists
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID '${productId}' not found`);
    }

    return this.recipeRepository.findActiveByProductId(productId);
  }

  async update(
    id: string,
    dto: UpdateRecipeDto,
  ): Promise<RecipeWithItems> {
    const existingRecipe = await this.findOne(id);
    const oldValue = {
      id: existingRecipe.id,
      notes: existingRecipe.notes,
      isActive: existingRecipe.isActive,
      items: existingRecipe.items.map((i) => ({
        ingredientId: i.ingredientId,
        quantity: i.quantity.toString(),
      })),
    };

    // Validate ingredients if items are being updated
    if (dto.items) {
      const ingredientIds = dto.items.map((i) => i.ingredientId);
      const ingredients = await this.prisma.ingredient.findMany({
        where: { id: { in: ingredientIds }, deletedAt: null },
      });

      if (ingredients.length !== ingredientIds.length) {
        const foundIds = new Set(ingredients.map((i) => i.id));
        const missing = ingredientIds.filter((iid) => !foundIds.has(iid));
        throw new NotFoundException(`Ingredients not found: ${missing.join(', ')}`);
      }

      const inactiveIngredients = ingredients.filter((i) => !i.isActive);
      if (inactiveIngredients.length > 0) {
        throw new BadRequestException(
          `Inactive ingredients cannot be used: ${inactiveIngredients.map((i) => i.id).join(', ')}`,
        );
      }
    }

    // If activating this recipe, deactivate all others
    if (dto.isActive === true && !existingRecipe.isActive) {
      await this.recipeRepository.deactivateAllForProduct(existingRecipe.productId);
    }

    // Update
    const updatedRecipe = await this.recipeRepository.update(id, {
      notes: dto.notes,
      isActive: dto.isActive,
      items: dto.items?.map((item) => ({
        ingredientId: item.ingredientId,
        quantity: item.quantity,
        unitId: item.unitId,
        wastePercentage: item.wastePercentage,
        notes: item.notes,
      })),
    });

    // Sync Product.currentHpp
    await this.syncProductHpp(existingRecipe.productId);

    // Audit Log
    await this.auditService.log({
      action: 'recipe.updated',
      resource: 'Recipe',
      resourceId: id,
      oldValue,
      newValue: {
        id: updatedRecipe.id,
        notes: updatedRecipe.notes,
        isActive: updatedRecipe.isActive,
        items: updatedRecipe.items.map((i) => ({
          ingredientId: i.ingredientId,
          quantity: i.quantity.toString(),
        })),
      },
    });

    // Publish Events
    this.eventBus.publish(
      new BaseDomainEvent('recipe.updated', id, 'Recipe', {
        id,
        productId: existingRecipe.productId,
        isActive: updatedRecipe.isActive,
      }),
    );

    return updatedRecipe;
  }

  async remove(id: string): Promise<void> {
    const recipe = await this.findOne(id);
    const oldValue = {
      id: recipe.id,
      productId: recipe.productId,
      version: recipe.version,
      isActive: recipe.isActive,
      itemCount: recipe.items.length,
    };

    await this.recipeRepository.softDelete(id);

    // If deleted recipe was active, reset Product.currentHpp
    if (recipe.isActive) {
      await this.syncProductHpp(recipe.productId);
    }

    // Audit Log
    await this.auditService.log({
      action: 'recipe.deleted',
      resource: 'Recipe',
      resourceId: id,
      oldValue,
    });

    // Publish Event
    this.eventBus.publish(
      new BaseDomainEvent('recipe.deleted', id, 'Recipe', {
        id,
        productId: recipe.productId,
      }),
    );
  }

  async activate(id: string): Promise<RecipeWithItems> {
    const recipe = await this.findOne(id);

    // Deactivate all others for this product
    await this.recipeRepository.deactivateAllForProduct(recipe.productId);

    // Activate this one
    const updatedRecipe = await this.recipeRepository.update(id, {
      isActive: true,
    });

    // Sync Product.currentHpp
    await this.syncProductHpp(recipe.productId);

    // Audit Log
    await this.auditService.log({
      action: 'recipe.activated',
      resource: 'Recipe',
      resourceId: id,
      newValue: { id, version: recipe.version, productId: recipe.productId },
    });

    // Publish Event
    this.eventBus.publish(
      new BaseDomainEvent('recipe.activated', id, 'Recipe', {
        id,
        productId: recipe.productId,
        version: recipe.version,
      }),
    );

    return updatedRecipe;
  }
}

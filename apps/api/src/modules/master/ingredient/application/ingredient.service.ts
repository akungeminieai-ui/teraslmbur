import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaIngredientRepository } from '../infrastructure/prisma-ingredient.repository';
import { PrismaUnitRepository } from '../../unit/infrastructure/prisma-unit.repository';
import { AuditService } from '../../../system/audit/audit.service';
import { EventBusService } from '../../../system/event-bus/event-bus.service';
import { BaseDomainEvent } from '../../../system/event-bus/base-domain-event';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { Ingredient, IngredientTranslation } from '@/generated/client';
import { Decimal } from '@/generated/client/runtime/library';

@Injectable()
export class IngredientService {
  constructor(
    private readonly ingredientRepository: PrismaIngredientRepository,
    private readonly unitRepository: PrismaUnitRepository,
    private readonly auditService: AuditService,
    private readonly eventBus: EventBusService,
  ) {}

  private async generateSku(): Promise<string> {
    const list = await this.ingredientRepository.findAll({ page: 1, pageSize: 1 });
    const count = list.total;
    const formattedNum = (count + 1).toString().padStart(4, '0');
    return `ING-${formattedNum}`;
  }

  async create(dto: CreateIngredientDto): Promise<Ingredient & { translations: IngredientTranslation[] }> {
    // Validate units
    const invUnit = await this.unitRepository.findById(dto.inventoryUnitId);
    if (!invUnit) {
      throw new NotFoundException(`Inventory Unit with ID '${dto.inventoryUnitId}' not found`);
    }

    if (dto.purchaseUnitId) {
      const purUnit = await this.unitRepository.findById(dto.purchaseUnitId);
      if (!purUnit) {
        throw new NotFoundException(`Purchase Unit with ID '${dto.purchaseUnitId}' not found`);
      }
    }

    // Determine SKU
    let sku = dto.sku;
    if (!sku) {
      sku = await this.generateSku();
    }

    // Verify SKU uniqueness
    const existingSku = await this.ingredientRepository.findBySku(sku);
    if (existingSku) {
      sku = `${sku}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const ingredient = await this.ingredientRepository.create({
      ...dto,
      sku,
    });

    // Write Audit Log
    await this.auditService.log({
      action: 'ingredient.create',
      resource: 'Ingredient',
      resourceId: ingredient.id,
      newValue: ingredient,
    });

    // Publish Event
    this.eventBus.publish(
      new BaseDomainEvent('ingredient.created', ingredient.id, 'Ingredient', {
        id: ingredient.id,
        sku: ingredient.sku,
        translations: ingredient.translations,
      })
    );

    return ingredient;
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
    return this.ingredientRepository.findAll(query);
  }

  async findOne(id: string): Promise<Ingredient & { translations: IngredientTranslation[] }> {
    const ingredient = await this.ingredientRepository.findById(id);
    if (!ingredient) {
      throw new NotFoundException(`Ingredient with ID '${id}' not found`);
    }
    return ingredient;
  }

  async update(id: string, dto: UpdateIngredientDto): Promise<Ingredient & { translations: IngredientTranslation[] }> {
    const ingredient = await this.findOne(id);
    const oldValue = { ...ingredient };

    // Validate units if changing
    if (dto.inventoryUnitId && dto.inventoryUnitId !== ingredient.inventoryUnitId) {
      const invUnit = await this.unitRepository.findById(dto.inventoryUnitId);
      if (!invUnit) {
        throw new NotFoundException(`Inventory Unit with ID '${dto.inventoryUnitId}' not found`);
      }
    }

    if (dto.purchaseUnitId && dto.purchaseUnitId !== ingredient.purchaseUnitId) {
      const purUnit = await this.unitRepository.findById(dto.purchaseUnitId);
      if (!purUnit) {
        throw new NotFoundException(`Purchase Unit with ID '${dto.purchaseUnitId}' not found`);
      }
    }

    if (dto.sku && dto.sku !== ingredient.sku) {
      const existingSku = await this.ingredientRepository.findBySku(dto.sku);
      if (existingSku) {
        throw new BadRequestException(`Ingredient with SKU '${dto.sku}' already exists`);
      }
    }

    const updatedIngredient = await this.ingredientRepository.update(id, dto);

    // Audit Log
    await this.auditService.log({
      action: 'ingredient.update',
      resource: 'Ingredient',
      resourceId: id,
      oldValue,
      newValue: updatedIngredient,
    });

    // General update event
    this.eventBus.publish(
      new BaseDomainEvent('ingredient.updated', id, 'Ingredient', {
        id,
        sku: updatedIngredient.sku,
        translations: updatedIngredient.translations,
      })
    );

    // Cost change detection
    if (dto.costPerUnit !== undefined) {
      const oldCost = new Decimal(ingredient.costPerUnit);
      const newCost = new Decimal(dto.costPerUnit);
      if (!oldCost.equals(newCost)) {
        this.eventBus.publish(
          new BaseDomainEvent('ingredient.cost_updated', id, 'Ingredient', {
            id,
            oldCost: oldCost.toNumber(),
            newCost: newCost.toNumber(),
          })
        );
      }
    }

    // Active status change detection
    if (dto.isActive !== undefined && dto.isActive !== ingredient.isActive) {
      const eventName = dto.isActive ? 'ingredient.activated' : 'ingredient.deactivated';
      this.eventBus.publish(
        new BaseDomainEvent(eventName, id, 'Ingredient', {
          id,
        })
      );
    }

    return updatedIngredient;
  }

  async remove(id: string, reason?: string): Promise<void> {
    const ingredient = await this.findOne(id);
    const oldValue = { ...ingredient };

    await this.ingredientRepository.softDelete(id);

    // Audit Log
    await this.auditService.log({
      action: 'ingredient.delete',
      resource: 'Ingredient',
      resourceId: id,
      oldValue,
      reason,
    });

    // Publish Event
    this.eventBus.publish(
      new BaseDomainEvent('ingredient.deleted', id, 'Ingredient', {
        id,
        sku: ingredient.sku,
      })
    );
  }

  async duplicate(id: string): Promise<Ingredient & { translations: IngredientTranslation[] }> {
    const source = await this.findOne(id);

    const translations = source.translations.map((t) => ({
      locale: t.locale,
      name: `${t.name} (Copy)`,
      description: t.description || undefined,
    }));

    let targetSku = source.sku ? `${source.sku}-copy` : await this.generateSku();
    const existingSku = await this.ingredientRepository.findBySku(targetSku);
    if (existingSku) {
      targetSku = `${targetSku}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const duplicated = await this.ingredientRepository.create({
      sku: targetSku,
      supplierReference: source.supplierReference || undefined,
      inventoryUnitId: source.inventoryUnitId,
      purchaseUnitId: source.purchaseUnitId || undefined,
      minimumStock: parseFloat(source.minimumStock as unknown as string),
      reorderLevel: parseFloat(source.reorderLevel as unknown as string),
      idealStock: parseFloat(source.idealStock as unknown as string),
      conversionRatio: parseFloat(source.conversionRatio as unknown as string),
      costPerUnit: parseFloat(source.costPerUnit as unknown as string),
      notes: source.notes || undefined,
      isActive: false,
      translations,
    });

    // Write Audit Log
    await this.auditService.log({
      action: 'ingredient.duplicate',
      resource: 'Ingredient',
      resourceId: duplicated.id,
      oldValue: source,
      newValue: duplicated,
    });

    // Publish Event
    this.eventBus.publish(
      new BaseDomainEvent('ingredient.duplicated', duplicated.id, 'Ingredient', {
        id: duplicated.id,
        sku: duplicated.sku,
        translations: duplicated.translations,
      })
    );

    return duplicated;
  }

  async adjust(
    id: string,
    body: { quantity: number; type: 'IN' | 'OUT' | 'SET'; notes?: string }
  ) {
    await this.findOne(id);
    
    let delta = body.quantity;
    if (body.type === 'SET') {
      const current = await this.ingredientRepository.getCurrentStock(id);
      delta = body.quantity - current;
    } else if (body.type === 'OUT') {
      delta = -Math.abs(body.quantity);
    } else if (body.type === 'IN') {
      delta = Math.abs(body.quantity);
    }

    const tx = await this.ingredientRepository.createTransaction(id, delta, body.notes);

    // Audit Log
    await this.auditService.log({
      action: 'ingredient.adjust',
      resource: 'Ingredient',
      resourceId: id,
      newValue: { delta, notes: body.notes },
    });

    // Publish Event
    this.eventBus.publish(
      new BaseDomainEvent('ingredient.stock_adjusted', id, 'Ingredient', {
        id,
        delta,
        notes: body.notes,
      })
    );

    return tx;
  }
}

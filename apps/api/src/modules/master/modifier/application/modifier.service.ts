import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaModifierRepository } from '../infrastructure/prisma-modifier.repository';
import { AuditService } from '../../../system/audit/audit.service';
import { EventBusService } from '../../../system/event-bus/event-bus.service';
import { BaseDomainEvent } from '../../../system/event-bus/base-domain-event';
import { CreateModifierGroupDto } from './dto/create-modifier-group.dto';
import { UpdateModifierGroupDto } from './dto/update-modifier-group.dto';

@Injectable()
export class ModifierService {
  constructor(
    private readonly modifierRepository: PrismaModifierRepository,
    private readonly auditService: AuditService,
    private readonly eventBus: EventBusService,
  ) {}

  async create(dto: CreateModifierGroupDto) {
    const group = await this.modifierRepository.create(dto);

    // Audit Log
    await this.auditService.log({
      action: 'modifier.create',
      resource: 'ModifierGroup',
      resourceId: group.id,
      newValue: group,
    });

    // Domain Event
    this.eventBus.publish(
      new BaseDomainEvent('modifier.created', group.id, 'ModifierGroup', {
        id: group.id,
        isRequired: group.isRequired,
        minSelect: group.minSelect,
        maxSelect: group.maxSelect,
        displayOrder: group.displayOrder,
        isActive: group.isActive,
      })
    );

    return group;
  }

  async findAll(query?: {
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    isActive?: boolean;
  }) {
    return this.modifierRepository.findAll(query);
  }

  async findOne(id: string) {
    const group = await this.modifierRepository.findById(id);
    if (!group) {
      throw new NotFoundException(`Modifier group with ID '${id}' not found`);
    }
    return group;
  }

  async update(id: string, dto: UpdateModifierGroupDto) {
    const oldGroup = await this.findOne(id);
    const updatedGroup = await this.modifierRepository.update(id, dto);

    // Audit Log
    await this.auditService.log({
      action: 'modifier.update',
      resource: 'ModifierGroup',
      resourceId: id,
      oldValue: oldGroup,
      newValue: updatedGroup,
    });

    // Domain Event
    this.eventBus.publish(
      new BaseDomainEvent('modifier.updated', id, 'ModifierGroup', {
        id,
        isRequired: updatedGroup.isRequired,
        minSelect: updatedGroup.minSelect,
        maxSelect: updatedGroup.maxSelect,
        displayOrder: updatedGroup.displayOrder,
        isActive: updatedGroup.isActive,
      })
    );

    return updatedGroup;
  }

  async remove(id: string) {
    const oldGroup = await this.findOne(id);

    const deletable = await this.canDelete(id);
    if (!deletable) {
      throw new Error(`Modifier group with ID '${id}' cannot be deleted`);
    }

    await this.modifierRepository.softDelete(id);

    // Audit Log
    await this.auditService.log({
      action: 'modifier.delete',
      resource: 'ModifierGroup',
      resourceId: id,
      oldValue: oldGroup,
    });

    // Domain Event
    this.eventBus.publish(
      new BaseDomainEvent('modifier.deleted', id, 'ModifierGroup', {
        id,
      })
    );
  }

  async canDelete(_id: string): Promise<boolean> {
    // Extensible hook for Phase 2 product assignment validation
    return true;
  }

  async duplicate(id: string) {
    const sourceGroup = await this.findOne(id);

    const payload = {
      isRequired: sourceGroup.isRequired,
      minSelect: sourceGroup.minSelect,
      maxSelect: sourceGroup.maxSelect,
      displayOrder: sourceGroup.displayOrder,
      isActive: sourceGroup.isActive,
      translations: sourceGroup.translations.map((t) => ({
        locale: t.locale,
        name: `${t.name} (Copy)`,
      })),
      options: sourceGroup.options.map((opt) => ({
        displayOrder: opt.displayOrder,
        priceAdjustment: parseFloat(opt.priceAdjustment.toString()),
        translations: opt.translations.map((ot) => ({
          locale: ot.locale,
          name: ot.name,
        })),
      })),
    };

    const duplicatedGroup = await this.modifierRepository.create(payload);

    // Audit Log
    await this.auditService.log({
      action: 'modifier.duplicate',
      resource: 'ModifierGroup',
      resourceId: duplicatedGroup.id,
      oldValue: sourceGroup,
      newValue: duplicatedGroup,
    });

    // Domain Event
    this.eventBus.publish(
      new BaseDomainEvent('modifier.duplicated', duplicatedGroup.id, 'ModifierGroup', {
        id: duplicatedGroup.id,
        sourceId: id,
      })
    );

    return duplicatedGroup;
  }
}

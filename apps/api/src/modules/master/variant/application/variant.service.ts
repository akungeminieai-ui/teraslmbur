import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaVariantRepository } from '../infrastructure/prisma-variant.repository';
import { AuditService } from '../../../system/audit/audit.service';
import { EventBusService } from '../../../system/event-bus/event-bus.service';
import { BaseDomainEvent } from '../../../system/event-bus/base-domain-event';
import { CreateVariantGroupDto } from './dto/create-variant-group.dto';
import { UpdateVariantGroupDto } from './dto/update-variant-group.dto';

@Injectable()
export class VariantService {
  constructor(
    private readonly variantRepository: PrismaVariantRepository,
    private readonly auditService: AuditService,
    private readonly eventBus: EventBusService,
  ) {}

  async create(dto: CreateVariantGroupDto) {
    const group = await this.variantRepository.create(dto);

    // Audit Log
    await this.auditService.log({
      action: 'variant.create',
      resource: 'VariantGroup',
      resourceId: group.id,
      newValue: group,
    });

    // Domain Event
    this.eventBus.publish(
      new BaseDomainEvent('variant.created', group.id, 'VariantGroup', {
        id: group.id,
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
    return this.variantRepository.findAll(query);
  }

  async findOne(id: string) {
    const group = await this.variantRepository.findById(id);
    if (!group) {
      throw new NotFoundException(`Variant group with ID '${id}' not found`);
    }
    return group;
  }

  async update(id: string, dto: UpdateVariantGroupDto) {
    const oldGroup = await this.findOne(id);
    const updatedGroup = await this.variantRepository.update(id, dto);

    // Audit Log
    await this.auditService.log({
      action: 'variant.update',
      resource: 'VariantGroup',
      resourceId: id,
      oldValue: oldGroup,
      newValue: updatedGroup,
    });

    // Domain Event
    this.eventBus.publish(
      new BaseDomainEvent('variant.updated', id, 'VariantGroup', {
        id,
        displayOrder: updatedGroup.displayOrder,
        isActive: updatedGroup.isActive,
      })
    );

    return updatedGroup;
  }

  async remove(id: string) {
    const oldGroup = await this.findOne(id);

    // canDelete check (Phase 1 always returns true)
    const deletable = await this.canDelete(id);
    if (!deletable) {
      throw new Error(`Variant group with ID '${id}' cannot be deleted`);
    }

    await this.variantRepository.softDelete(id);

    // Audit Log
    await this.auditService.log({
      action: 'variant.delete',
      resource: 'VariantGroup',
      resourceId: id,
      oldValue: oldGroup,
    });

    // Domain Event
    this.eventBus.publish(
      new BaseDomainEvent('variant.deleted', id, 'VariantGroup', {
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
      displayOrder: sourceGroup.displayOrder,
      isActive: sourceGroup.isActive,
      translations: sourceGroup.translations.map((t) => ({
        locale: t.locale,
        name: `${t.name} (Copy)`,
      })),
      options: sourceGroup.options.map((opt) => ({
        displayOrder: opt.displayOrder,
        translations: opt.translations.map((ot) => ({
          locale: ot.locale,
          name: ot.name,
        })),
      })),
    };

    const duplicatedGroup = await this.variantRepository.create(payload);

    // Audit Log
    await this.auditService.log({
      action: 'variant.duplicate',
      resource: 'VariantGroup',
      resourceId: duplicatedGroup.id,
      oldValue: sourceGroup,
      newValue: duplicatedGroup,
    });

    // Domain Event
    this.eventBus.publish(
      new BaseDomainEvent('variant.duplicated', duplicatedGroup.id, 'VariantGroup', {
        id: duplicatedGroup.id,
        sourceId: id,
      })
    );

    return duplicatedGroup;
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaUnitRepository } from '../infrastructure/prisma-unit.repository';
import { AuditService } from '../../../system/audit/audit.service';
import { EventBusService } from '../../../system/event-bus/event-bus.service';
import { BaseDomainEvent } from '../../../system/event-bus/base-domain-event';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { Unit } from '@prisma/client';

@Injectable()
export class UnitService {
  constructor(
    private readonly unitRepository: PrismaUnitRepository,
    private readonly auditService: AuditService,
    private readonly eventBus: EventBusService,
  ) {}

  async create(dto: CreateUnitDto): Promise<Unit> {
    // Check name uniqueness
    const existingName = await this.unitRepository.findByName(dto.name);
    if (existingName) {
      throw new BadRequestException(`Unit with name '${dto.name}' already exists`);
    }

    // Check abbreviation uniqueness
    const existingAbbr = await this.unitRepository.findByAbbreviation(dto.abbreviation);
    if (existingAbbr) {
      throw new BadRequestException(`Unit with abbreviation '${dto.abbreviation}' already exists`);
    }

    const unit = await this.unitRepository.create(dto);

    // Write Audit Log
    await this.auditService.log({
      action: 'unit.create',
      resource: 'Unit',
      resourceId: unit.id,
      newValue: unit,
    });

    // Publish Event
    this.eventBus.publish(
      new BaseDomainEvent('unit.created', unit.id, 'Unit', {
        id: unit.id,
        name: unit.name,
        abbreviation: unit.abbreviation,
        type: unit.type,
      })
    );

    return unit;
  }

  async findAll(query?: {
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ items: Unit[]; total: number }> {
    return this.unitRepository.findAll(query);
  }

  async findOne(id: string): Promise<Unit> {
    const unit = await this.unitRepository.findById(id);
    if (!unit) {
      throw new NotFoundException(`Unit with ID '${id}' not found`);
    }
    return unit;
  }

  async update(id: string, dto: UpdateUnitDto): Promise<Unit> {
    const unit = await this.findOne(id);
    const oldValue = { ...unit };

    if (dto.name && dto.name !== unit.name) {
      const existingName = await this.unitRepository.findByName(dto.name);
      if (existingName) {
        throw new BadRequestException(`Unit with name '${dto.name}' already exists`);
      }
    }

    if (dto.abbreviation && dto.abbreviation !== unit.abbreviation) {
      const existingAbbr = await this.unitRepository.findByAbbreviation(dto.abbreviation);
      if (existingAbbr) {
        throw new BadRequestException(`Unit with abbreviation '${dto.abbreviation}' already exists`);
      }
    }

    const updatedUnit = await this.unitRepository.update(id, dto);

    // Write Audit Log
    await this.auditService.log({
      action: 'unit.update',
      resource: 'Unit',
      resourceId: id,
      oldValue,
      newValue: updatedUnit,
    });

    // Publish Event
    this.eventBus.publish(
      new BaseDomainEvent('unit.updated', id, 'Unit', {
        id,
        name: updatedUnit.name,
        abbreviation: updatedUnit.abbreviation,
        type: updatedUnit.type,
      })
    );

    return updatedUnit;
  }

  async remove(id: string, reason?: string): Promise<void> {
    const unit = await this.findOne(id);
    const oldValue = { ...unit };

    await this.unitRepository.softDelete(id);

    // Write Audit Log
    await this.auditService.log({
      action: 'unit.delete',
      resource: 'Unit',
      resourceId: id,
      oldValue,
      reason,
    });

    // Publish Event
    this.eventBus.publish(
      new BaseDomainEvent('unit.deleted', id, 'Unit', {
        id,
        name: unit.name,
      })
    );
  }

  async duplicate(id: string): Promise<Unit> {
    const source = await this.findOne(id);

    let targetName = `${source.name} (Copy)`;
    let targetAbbr = `${source.abbreviation} (Copy)`;

    let nameCollisionIndex = 1;
    while (await this.unitRepository.findByName(targetName)) {
      nameCollisionIndex++;
      targetName = `${source.name} (Copy ${nameCollisionIndex})`;
    }

    let abbrCollisionIndex = 1;
    while (await this.unitRepository.findByAbbreviation(targetAbbr)) {
      abbrCollisionIndex++;
      targetAbbr = `${source.abbreviation} (Copy ${abbrCollisionIndex})`;
    }

    const duplicated = await this.unitRepository.create({
      name: targetName,
      abbreviation: targetAbbr,
      type: source.type,
    });

    // Write Audit Log
    await this.auditService.log({
      action: 'unit.duplicate',
      resource: 'Unit',
      resourceId: duplicated.id,
      oldValue: source,
      newValue: duplicated,
    });

    // Publish Event
    this.eventBus.publish(
      new BaseDomainEvent('unit.duplicated', duplicated.id, 'Unit', {
        id: duplicated.id,
        name: duplicated.name,
        abbreviation: duplicated.abbreviation,
      })
    );

    return duplicated;
  }
}

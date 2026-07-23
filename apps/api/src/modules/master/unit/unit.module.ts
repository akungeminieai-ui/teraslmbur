import { Module } from '@nestjs/common';
import { UnitController } from './presentation/unit.controller';
import { UnitService } from './application/unit.service';
import { PrismaUnitRepository } from './infrastructure/prisma-unit.repository';
import { UnitConversionService } from './application/unit-conversion.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuditModule } from '../../system/audit/audit.module';
import { EventBusModule } from '../../system/event-bus/event-bus.module';

@Module({
  imports: [PrismaModule, AuditModule, EventBusModule],
  controllers: [UnitController],
  providers: [UnitService, PrismaUnitRepository, UnitConversionService],
  exports: [UnitService, PrismaUnitRepository, UnitConversionService],
})
export class UnitModule {}

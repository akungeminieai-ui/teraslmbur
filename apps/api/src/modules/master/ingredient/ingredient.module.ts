import { Module } from '@nestjs/common';
import { IngredientController } from './presentation/ingredient.controller';
import { IngredientService } from './application/ingredient.service';
import { PrismaIngredientRepository } from './infrastructure/prisma-ingredient.repository';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuditModule } from '../../system/audit/audit.module';
import { EventBusModule } from '../../system/event-bus/event-bus.module';
import { UnitModule } from '../unit/unit.module';

@Module({
  imports: [PrismaModule, AuditModule, EventBusModule, UnitModule],
  controllers: [IngredientController],
  providers: [IngredientService, PrismaIngredientRepository],
  exports: [IngredientService, PrismaIngredientRepository],
})
export class IngredientModule {}

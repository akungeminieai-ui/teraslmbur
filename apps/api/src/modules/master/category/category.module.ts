import { Module } from '@nestjs/common';
import { CategoryController } from './presentation/category.controller';
import { CategoryService } from './application/category.service';
import { PrismaCategoryRepository } from './infrastructure/prisma-category.repository';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuditModule } from '../../system/audit/audit.module';
import { EventBusModule } from '../../system/event-bus/event-bus.module';

@Module({
  imports: [PrismaModule, AuditModule, EventBusModule],
  controllers: [CategoryController],
  providers: [CategoryService, PrismaCategoryRepository],
  exports: [CategoryService, PrismaCategoryRepository],
})
export class CategoryModule {}

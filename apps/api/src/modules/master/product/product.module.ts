import { Module } from '@nestjs/common';
import { ProductController } from './presentation/product.controller';
import { ProductService } from './application/product.service';
import { PrismaProductRepository } from './infrastructure/prisma-product.repository';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuditModule } from '../../system/audit/audit.module';
import { EventBusModule } from '../../system/event-bus/event-bus.module';

@Module({
  imports: [PrismaModule, AuditModule, EventBusModule],
  controllers: [ProductController],
  providers: [ProductService, PrismaProductRepository],
  exports: [ProductService, PrismaProductRepository],
})
export class ProductModule {}

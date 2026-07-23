import { Module } from '@nestjs/common';
import { VariantService } from './application/variant.service';
import { VariantController } from './presentation/variant.controller';
import { PrismaVariantRepository } from './infrastructure/prisma-variant.repository';

@Module({
  controllers: [VariantController],
  providers: [VariantService, PrismaVariantRepository],
  exports: [VariantService, PrismaVariantRepository],
})
export class VariantModule {}

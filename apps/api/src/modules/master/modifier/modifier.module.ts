import { Module } from '@nestjs/common';
import { ModifierService } from './application/modifier.service';
import { ModifierController } from './presentation/modifier.controller';
import { PrismaModifierRepository } from './infrastructure/prisma-modifier.repository';

@Module({
  controllers: [ModifierController],
  providers: [ModifierService, PrismaModifierRepository],
  exports: [ModifierService, PrismaModifierRepository],
})
export class ModifierModule {}

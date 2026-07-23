import { Module } from '@nestjs/common';
import { RecipeController } from './presentation/recipe.controller';
import { RecipeService } from './application/recipe.service';
import { PrismaRecipeRepository } from './infrastructure/prisma-recipe.repository';
import { PrismaModule } from '@/prisma/prisma.module';
import { AuditModule } from '../../system/audit/audit.module';
import { EventBusModule } from '../../system/event-bus/event-bus.module';

@Module({
  imports: [PrismaModule, AuditModule, EventBusModule],
  controllers: [RecipeController],
  providers: [RecipeService, PrismaRecipeRepository],
  exports: [RecipeService, PrismaRecipeRepository],
})
export class RecipeModule {}

import { Module } from '@nestjs/common';
import { UnitModule } from './unit/unit.module';
import { CategoryModule } from './category/category.module';
import { IngredientModule } from './ingredient/ingredient.module';
import { ProductModule } from './product/product.module';
import { VariantModule } from './variant/variant.module';
import { ModifierModule } from './modifier/modifier.module';
import { RecipeModule } from './recipe/recipe.module';
import { MediaModule } from './media/media.module';

@Module({
  imports: [UnitModule, CategoryModule, IngredientModule, ProductModule, VariantModule, ModifierModule, RecipeModule, MediaModule],
  exports: [UnitModule, CategoryModule, IngredientModule, ProductModule, VariantModule, ModifierModule, RecipeModule, MediaModule],
})
export class MasterModule {}

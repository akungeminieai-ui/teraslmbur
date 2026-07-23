import { Recipe, RecipeItem, Ingredient, IngredientTranslation } from '@prisma/client';

export type RecipeWithItems = Recipe & {
  items: (RecipeItem & {
    ingredient: Ingredient & {
      translations: IngredientTranslation[];
      inventoryUnit: { id: string; name: string; abbreviation: string };
    };
    unit: { id: string; name: string; abbreviation: string } | null;
  })[];
  product?: {
    id: string;
    sellingPrice: any;
    currentHpp: any;
    translations: { locale: string; name: string }[];
  };
};

export interface IRecipeRepository {
  create(data: {
    productId: string;
    version: number;
    notes?: string | null;
    isActive?: boolean;
    items: {
      ingredientId: string;
      quantity: number | string;
      unitId?: string | null;
      wastePercentage?: number | string;
      notes?: string | null;
    }[];
  }): Promise<RecipeWithItems>;

  findAll(query?: {
    productId?: string;
    isActive?: boolean;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ items: RecipeWithItems[]; total: number }>;

  findById(id: string): Promise<RecipeWithItems | null>;

  findActiveByProductId(productId: string): Promise<RecipeWithItems | null>;

  getMaxVersion(productId: string): Promise<number>;

  update(
    id: string,
    data: {
      notes?: string | null;
      isActive?: boolean;
      items?: {
        ingredientId: string;
        quantity: number | string;
        unitId?: string | null;
        wastePercentage?: number | string;
        notes?: string | null;
      }[];
    },
  ): Promise<RecipeWithItems>;

  softDelete(id: string): Promise<Recipe>;

  deactivateAllForProduct(productId: string): Promise<void>;
}

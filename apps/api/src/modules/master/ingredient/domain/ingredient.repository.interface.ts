import { Ingredient, IngredientTranslation } from '@prisma/client';

export interface IIngredientRepository {
  create(data: {
    sku?: string | null;
    inventoryUnitId: string;
    purchaseUnitId?: string | null;
    minimumStock?: number | string;
    reorderLevel?: number | string;
    idealStock?: number | string;
    conversionRatio?: number | string;
    supplierReference?: string | null;
    costPerUnit?: number | string;
    isActive?: boolean;
    notes?: string | null;
    translations: { locale: string; name: string; description?: string | null }[];
  }): Promise<Ingredient & { translations: IngredientTranslation[] }>;

  findAll(query?: {
    search?: string;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    isActive?: boolean;
  }): Promise<{
    items: (Ingredient & {
      translations: IngredientTranslation[];
      inventoryUnit: { id: string; name: string; abbreviation: string };
      purchaseUnit: { id: string; name: string; abbreviation: string } | null;
      currentStock?: number;
      todayUsage?: number;
    })[];
    total: number;
  }>;

  findById(id: string): Promise<(Ingredient & { translations: IngredientTranslation[] }) | null>;
  findBySku(sku: string): Promise<Ingredient | null>;

  update(
    id: string,
    data: {
      sku?: string | null;
      inventoryUnitId?: string;
      purchaseUnitId?: string | null;
      minimumStock?: number | string;
      reorderLevel?: number | string;
      idealStock?: number | string;
      conversionRatio?: number | string;
      supplierReference?: string | null;
      costPerUnit?: number | string;
      isActive?: boolean;
      notes?: string | null;
      translations?: { locale: string; name: string; description?: string | null }[];
    }
  ): Promise<Ingredient & { translations: IngredientTranslation[] }>;

  softDelete(id: string): Promise<Ingredient>;
  getCurrentStock(ingredientId: string): Promise<number>;
  createTransaction(ingredientId: string, quantity: number, notes?: string): Promise<any>;
}

// ============================================================
// Catalog Types — Teras Lmbur OS
// ============================================================

import type { UnitType } from './enums';

/** Product category */
export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  outletId: string | null;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
}

/** Product in the catalog */
export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  /** Decimal string — NEVER use float for money */
  price: string;
  image: string | null;
  isActive: boolean;
  categoryId: string;
  category?: Category;
  recipe?: Recipe;
  outletId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Measurement unit */
export interface Unit {
  id: string;
  name: string;
  abbreviation: string;
  type: UnitType;
}

/** Recipe Bill of Materials for a product */
export interface Recipe {
  id: string;
  productId: string;
  items: RecipeItem[];
  notes: string | null;
  /** Calculated total cost from ingredient BOM */
  totalCost?: string;
  createdAt: string;
  updatedAt: string;
}

/** Single ingredient line in a recipe BOM */
export interface RecipeItem {
  id: string;
  recipeId: string;
  ingredientId: string;
  ingredient?: Ingredient;
  /** Decimal string — quantity of ingredient needed */
  quantity: string;
  /** Calculated line cost = quantity * ingredient.costPerUnit */
  lineCost?: string;
}

/** Raw ingredient / inventory item */
export interface Ingredient {
  id: string;
  name: string;
  sku: string | null;
  unitId: string;
  unit?: Unit;
  /** Decimal string */
  currentStock: string;
  /** Decimal string — minimum before low-stock alert */
  minStock: string;
  /** Decimal string — cost per unit for HPP calculation */
  costPerUnit: string;
  outletId: string | null;
  createdAt: string;
  updatedAt: string;
}

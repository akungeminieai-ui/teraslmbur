// ============================================================
// Catalog Types — Teras Lmbur OS
// ============================================================

import type { UnitType, ProductAvailability } from './enums';

/** Product category */
export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
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
  availability: ProductAvailability;
  categoryId: string;
  category?: Category;
  recipes?: Recipe[];
  variants?: ProductVariant[];
  modifiers?: ProductModifier[];
  createdAt: string;
  updatedAt: string;
}

/** Variant Group Template (e.g. Size, Temperature) */
export interface VariantGroup {
  id: string;
  name: string;
  options: VariantOption[];
  createdAt: string;
  updatedAt: string;
}

/** Individual Option inside Variant Group (e.g. Small, Medium) */
export interface VariantOption {
  id: string;
  groupId: string;
  name: string;
  displayOrder: number;
}

/** Concrete product variant association mapping */
export interface ProductVariant {
  id: string;
  productId: string;
  optionId: string;
  option?: VariantOption;
  /** Decimal price adjustment (e.g. "+15.00") */
  priceAdjustment: string;
  sku: string | null;
  isActive: boolean;
}

/** Modifier Group Template (e.g. Sugar level, Toppings) */
export interface ModifierGroup {
  id: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  options: ModifierOption[];
  createdAt: string;
  updatedAt: string;
}

/** Option inside Modifier Group (e.g. Extra sugar, Less sugar) */
export interface ModifierOption {
  id: string;
  groupId: string;
  name: string;
  /** Decimal price adjustment (e.g. "+5.00") */
  priceAdjustment: string;
  displayOrder: number;
  isActive: boolean;
}

/** Junction relation linking product and modifier groups */
export interface ProductModifier {
  productId: string;
  modifierGroupId: string;
  group?: ModifierGroup;
}

/** Measurement unit */
export interface Unit {
  id: string;
  name: string;
  abbreviation: string;
  type: UnitType;
}

/** Versioned Recipe Bill of Materials for a product */
export interface Recipe {
  id: string;
  productId: string;
  version: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
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
  minStock: string;
  /** Decimal string — cost per unit for HPP calculation */
  costPerUnit: string;
  createdAt: string;
  updatedAt: string;
}

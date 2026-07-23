// ============================================================
// Inventory Types — Teras Lmbur OS
// ============================================================

import type { PurchaseStatus } from './enums.js';
import type { Ingredient } from './catalog.js';

/** Supplier / vendor */
export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
  outletId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Purchase order */
export interface Purchase {
  id: string;
  code: string;
  supplierId: string;
  supplier?: Supplier;
  items: PurchaseItem[];
  /** Decimal string */
  total: string;
  status: PurchaseStatus;
  notes: string | null;
  userId: string;
  outletId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Purchase order line item */
export interface PurchaseItem {
  id: string;
  purchaseId: string;
  ingredientId: string;
  ingredient?: Ingredient;
  /** Decimal string */
  quantity: string;
  /** Decimal string */
  unitPrice: string;
  /** Decimal string */
  total: string;
}

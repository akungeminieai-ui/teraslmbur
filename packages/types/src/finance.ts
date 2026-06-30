// ============================================================
// Finance & Inventory Ledger Types — Teras Lmbur OS
// ============================================================

import type { PaymentMethodType, InventoryTxType } from './enums';
import type { Unit } from './catalog';

/** Currency codes — extensible */
export type CurrencyCode = 'EGP' | 'USD' | 'EUR' | 'SAR' | (string & Record<never, never>);

/** Money value object — NEVER use float */
export interface Money {
  /** Decimal as string to avoid floating-point precision loss */
  amount: string;
  currency: CurrencyCode;
}

/** Payment Method Entity */
export interface PaymentMethod {
  id: string;
  name: string;
  code: string;
  type: PaymentMethodType;
  isActive: boolean;
}

/** Payment record */
export interface Payment {
  id: string;
  orderId: string;
  paymentMethodId: string;
  method?: PaymentMethod;
  /** Decimal string */
  amount: string;
  reference: string | null;
  createdAt: string;
}

/** Expense entry */
export interface Expense {
  id: string;
  category: string;
  description: string;
  /** Decimal string */
  amount: string;
  date: string;
  receiptUrl: string | null;
  userId: string;
  outletId: string;
  createdAt: string;
  updatedAt: string;
}

/** Daily cashier shift cash closing record */
export interface CashClosing {
  id: string;
  shiftId: string;
  /** Decimal string */
  openingBalance: string;
  /** Decimal string */
  totalSales: string;
  /** Decimal string */
  totalExpenses: string;
  /** Decimal string */
  closingBalance: string;
  /** Decimal string — difference between expected and actual */
  difference: string;
  notes: string | null;
  createdAt: string;
}

/** Tax rate configuration */
export interface Tax {
  id: string;
  name: string;
  /** Decimal string percentage (e.g. "14.00") */
  percentage: string;
  isActive: boolean;
}

/** Service charge rate configuration */
export interface ServiceCharge {
  id: string;
  name: string;
  /** Decimal string percentage (e.g. "12.00") */
  percentage: string;
  isActive: boolean;
}

/** Transaction-Based Inventory Ledger record */
export interface InventoryTransaction {
  id: string;
  ingredientId: string;
  outletId: string;
  /** Decimal string (+ for IN, - for OUT) */
  quantity: string;
  unitId: string;
  unit?: Unit;
  type: InventoryTxType;
  referenceType: string | null; // e.g. 'ORDER', 'PURCHASE', 'WASTE'
  referenceId: string | null;
  notes: string | null;
  createdAt: string;
}

/** Waste entry log */
export interface Waste {
  id: string;
  ingredientId: string;
  outletId: string;
  /** Decimal string */
  quantity: string;
  reason: string;
  /** Decimal string cost impact */
  costImpact: string;
  createdById: string;
  createdAt: string;
}

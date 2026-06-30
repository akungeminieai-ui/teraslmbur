// ============================================================
// Finance Types — Teras Lmbur OS
// ============================================================

import type { PaymentMethod } from './enums';

/** Currency codes — extensible */
export type CurrencyCode = 'EGP' | 'USD' | 'EUR' | 'SAR' | (string & Record<never, never>);

/** Money value object — NEVER use float */
export interface Money {
  /** Decimal as string to avoid floating-point precision loss */
  amount: string;
  currency: CurrencyCode;
}

/** Payment record */
export interface Payment {
  id: string;
  orderId: string;
  method: PaymentMethod;
  /** Decimal string */
  amount: string;
  reference: string | null;
  outletId: string | null;
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
  receipt: string | null;
  userId: string;
  outletId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Daily cash closing record */
export interface CashClosing {
  id: string;
  date: string;
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
  userId: string;
  outletId: string | null;
  createdAt: string;
}

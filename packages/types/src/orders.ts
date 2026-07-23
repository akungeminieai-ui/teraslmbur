// ============================================================
// Orders & Shift Types — Teras Lmbur OS
// ============================================================

import type { OrderStatus, OrderType, TableStatus, ShiftStatus } from './enums.js';
import type { Product } from './catalog.js';
import type { Customer } from './customers.js';
import type { Payment } from './finance.js';
import type { KitchenTicket } from './kitchen.js';

/** Cashier Shift Management */
export interface Shift {
  id: string;
  outletId: string;
  openedById: string;
  closedById: string | null;
  /** Decimal string */
  openingCash: string;
  /** Decimal string */
  closingCash: string | null;
  /** Decimal string */
  expectedCash: string | null;
  /** Decimal string */
  difference: string | null;
  openedAt: string;
  closedAt: string | null;
  status: ShiftStatus;
}

/** Restaurant table */
export interface Table {
  id: string;
  number: number;
  name: string | null;
  capacity: number;
  status: TableStatus;
  section: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Order entity */
export interface Order {
  id: string;
  code: string;
  type: OrderType;
  status: OrderStatus;
  tableId: string | null;
  table?: Table;
  customerId: string | null;
  customer?: Customer;
  shiftId: string | null;
  shift?: Shift;
  items: OrderItem[];
  payments?: Payment[];
  tickets?: KitchenTicket[];
  /** Decimal string */
  subtotal: string;
  /** Decimal string */
  discount: string;
  /** Decimal string */
  serviceCharge: string;
  /** Decimal string */
  tax: string;
  /** Decimal string */
  total: string;
  notes: string | null;
  userId: string;
  outletId: string;
  createdAt: string;
  updatedAt: string;
}

/** Line item within an order */
export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  product?: Product;
  quantity: number;
  /** Decimal string */
  unitPrice: string;
  /** Decimal string */
  subtotal: string;
  notes: string | null;
  createdAt: string;
}

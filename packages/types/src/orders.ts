// ============================================================
// Orders Types — Teras Lmbur OS
// ============================================================

import type { OrderStatus, OrderType, TableStatus } from './enums';
import type { Product } from './catalog';
import type { Customer } from './customers';
import type { Payment } from './finance';
import type { KitchenTicket } from './kitchen';

/** Restaurant table */
export interface Table {
  id: string;
  number: number;
  name: string | null;
  capacity: number;
  status: TableStatus;
  section: string | null;
  outletId: string | null;
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
  items: OrderItem[];
  payments?: Payment[];
  tickets?: KitchenTicket[];
  /** Decimal string */
  subtotal: string;
  /** Decimal string */
  discount: string;
  /** Decimal string */
  tax: string;
  /** Decimal string */
  total: string;
  notes: string | null;
  userId: string;
  outletId: string | null;
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

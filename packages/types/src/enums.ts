// ============================================================
// Shared Enums — Teras Lmbur OS
// ============================================================
// All enums used across domains. Never use raw string literals.
// Always reference these enums for type-safe state management.
// ============================================================

/** Order lifecycle state machine */
export enum OrderStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  ON_DELIVERY = 'ON_DELIVERY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/** Valid state transitions for orders */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.DRAFT]: [OrderStatus.PENDING, OrderStatus.CANCELLED],
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
  [OrderStatus.READY]: [
    OrderStatus.ON_DELIVERY,
    OrderStatus.COMPLETED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.ON_DELIVERY]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

/** Order type — how the order is fulfilled */
export enum OrderType {
  DINE_IN = 'DINE_IN',
  TAKE_AWAY = 'TAKE_AWAY',
  DELIVERY = 'DELIVERY',
}

/** Table availability status */
export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  MAINTENANCE = 'MAINTENANCE',
}

/** Kitchen ticket workflow status */
export enum KitchenTicketStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  VOIDED = 'VOIDED',
}

/** Printer routing targets */
export enum PrinterTarget {
  KITCHEN = 'KITCHEN',
  BAR = 'BAR',
  RECEIPT = 'RECEIPT',
}

/** Payment methods */
export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  TRANSFER = 'TRANSFER',
  E_WALLET = 'E_WALLET',
  OTHER = 'OTHER',
}

/** Purchase order status */
export enum PurchaseStatus {
  DRAFT = 'DRAFT',
  ORDERED = 'ORDERED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

/** Inventory log action types */
export enum InventoryLogType {
  PURCHASE = 'PURCHASE',
  SALE = 'SALE',
  ADJUSTMENT = 'ADJUSTMENT',
  WASTE = 'WASTE',
  TRANSFER = 'TRANSFER',
}

/** Ingredient unit classification */
export enum UnitType {
  WEIGHT = 'WEIGHT',
  VOLUME = 'VOLUME',
  COUNT = 'COUNT',
  PACK = 'PACK',
}

/** Notification delivery channels */
export enum NotificationChannel {
  WEBSOCKET = 'WEBSOCKET',
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
}

/** User roles — system defaults */
export enum SystemRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
  KITCHEN = 'KITCHEN',
  WAITER = 'WAITER',
}

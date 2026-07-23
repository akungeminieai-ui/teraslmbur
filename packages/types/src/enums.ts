// ============================================================
// Shared Business Enums — Teras Lmbur OS
// ============================================================
// Frozen Domain Contracts before Sprint 1 Implementation
// ============================================================

/** Order lifecycle state machine */
export enum OrderStatus {
  DRAFT = 'DRAFT',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAID = 'PAID',
  QUEUED = 'QUEUED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  SERVED = 'SERVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  VOIDED = 'VOIDED',
  REFUNDED = 'REFUNDED',
  CLEAR = 'CLEAR',
}

/** Customer fulfillment order type */
export enum OrderType {
  DINE_IN = 'DINE_IN',
  TAKE_AWAY = 'TAKE_AWAY',
  TAUSIL = 'TAUSIL', // Middle-East Delivery standard
  QR_ORDER = 'QR_ORDER',
  SELF_SERVICE_KIOSK = 'SELF_SERVICE_KIOSK',
}

/** Table lifecycle state */
export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  SEATED = 'SEATED',
  ORDERING = 'ORDERING',
  DINING = 'DINING',
  PAYMENT = 'PAYMENT',
  DIRTY = 'DIRTY',
  CLEANING = 'CLEANING',
}

/** Kitchen production ticket lifecycle */
export enum KitchenTicketStatus {
  WAITING = 'WAITING',
  ACCEPTED = 'ACCEPTED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  PICKED_UP = 'PICKED_UP',
  CANCELLED = 'CANCELLED',
}

/** Payment transaction lifecycle */
export enum PaymentStatus {
  PENDING = 'PENDING',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  VOIDED = 'VOIDED',
}

/** Payment method types */
export enum PaymentMethodType {
  CASH = 'CASH',
  INSTAPAY = 'INSTAPAY',
  BANK_TRANSFER = 'BANK_TRANSFER',
  VISA = 'VISA',
  MASTERCARD = 'MASTERCARD',
  WALLET = 'WALLET',
  OTHER = 'OTHER',
}

/** Cashier shift status */
export enum ShiftStatus {
  OPENING = 'OPENING',
  ACTIVE = 'ACTIVE',
  CLOSING = 'CLOSING',
  CLOSED = 'CLOSED',
  REOPENED = 'REOPENED',
}

/** Product domain hierarchy classifications */
export enum ProductType {
  MENU_ITEM = 'MENU_ITEM',
  INGREDIENT = 'INGREDIENT',
  SEMI_FINISHED = 'SEMI_FINISHED',
  COMBO = 'COMBO',
  ADD_ON = 'ADD_ON',
  MODIFIER = 'MODIFIER',
  VARIANT = 'VARIANT',
  BUNDLE = 'BUNDLE',
  RETAIL_PRODUCT = 'RETAIL_PRODUCT',
}

/** Inventory movement transaction type */
export enum InventoryTxType {
  PURCHASE = 'PURCHASE',
  PRODUCTION_USAGE = 'PRODUCTION_USAGE',
  WASTE = 'WASTE',
  ADJUSTMENT = 'ADJUSTMENT',
  RETURN = 'RETURN',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  STOCK_OPNAME = 'STOCK_OPNAME',
  SALE_DEDUCTION = 'SALE_DEDUCTION',
}

/** Default expense categorization */
export enum ExpenseCategory {
  RENT = 'RENT',
  SALARY = 'SALARY',
  GAS = 'GAS',
  ELECTRICITY = 'ELECTRICITY',
  INTERNET = 'INTERNET',
  INGREDIENTS = 'INGREDIENTS',
  PACKAGING = 'PACKAGING',
  MARKETING = 'MARKETING',
  MAINTENANCE = 'MAINTENANCE',
  TRANSPORTATION = 'TRANSPORTATION',
  MISCELLANEOUS = 'MISCELLANEOUS',
}

/** System roles permissions matrix */
export enum SystemRole {
  OWNER = 'OWNER',
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
  KITCHEN = 'KITCHEN',
  WAITER = 'WAITER',
  CUSTOMER = 'CUSTOMER',
}

/** Notification event identifiers catalog */
export enum NotificationEvent {
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_PAID = 'ORDER_PAID',
  KITCHEN_READY = 'KITCHEN_READY',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  CASH_CLOSING = 'CASH_CLOSING',
  LOW_STOCK = 'LOW_STOCK',
  PRINTER_OFFLINE = 'PRINTER_OFFLINE',
  WHATSAPP_FAILED = 'WHATSAPP_FAILED',
  RECEIPT_GENERATED = 'RECEIPT_GENERATED',
  INVENTORY_LOW = 'INVENTORY_LOW',
  DAILY_CLOSING = 'DAILY_CLOSING',
  EXPENSE_ADDED = 'EXPENSE_ADDED',
  REPORT_READY = 'REPORT_READY',
}

/** Valid state transitions for orders */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.DRAFT]: [OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED],
  [OrderStatus.PENDING_PAYMENT]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.QUEUED, OrderStatus.REFUNDED],
  [OrderStatus.QUEUED]: [OrderStatus.PREPARING, OrderStatus.VOIDED],
  [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.VOIDED],
  [OrderStatus.READY]: [OrderStatus.SERVED, OrderStatus.CLEAR],
  [OrderStatus.SERVED]: [OrderStatus.COMPLETED, OrderStatus.REFUNDED, OrderStatus.CLEAR],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.VOIDED]: [],
  [OrderStatus.REFUNDED]: [],
  [OrderStatus.CLEAR]: [],
};

export enum UnitType {
  WEIGHT = 'WEIGHT',
  VOLUME = 'VOLUME',
  COUNT = 'COUNT',
  PACK = 'PACK',
}

export enum ProductAvailability {
  AVAILABLE = 'AVAILABLE',
  UNAVAILABLE = 'UNAVAILABLE',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  DISCONTINUED = 'DISCONTINUED',
}

export enum PurchaseStatus {
  DRAFT = 'DRAFT',
  ORDERED = 'ORDERED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

export enum PrinterType {
  KITCHEN = 'KITCHEN',
  BAR = 'BAR',
  RECEIPT = 'RECEIPT',
}

export enum ConnectionType {
  NETWORK = 'NETWORK',
  USB = 'USB',
  BLUETOOTH = 'BLUETOOTH',
}

export enum NotificationChannel {
  WEBSOCKET = 'WEBSOCKET',
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
}

export enum OutletStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}



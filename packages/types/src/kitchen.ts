// ============================================================
// Kitchen & Printer Types — Teras Lmbur OS
// ============================================================

import type { KitchenTicketStatus, PrinterType, ConnectionType } from './enums';

/** Kitchen Station (e.g. Grill, Bar, Desserts) */
export interface KitchenStation {
  id: string;
  outletId: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Kitchen display ticket routed to a specific station */
export interface KitchenTicket {
  id: string;
  orderId: string;
  stationId: string;
  station?: KitchenStation;
  status: KitchenTicketStatus;
  priority: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Physical/network printer device */
export interface Printer {
  id: string;
  outletId: string;
  stationId: string | null;
  station?: KitchenStation;
  name: string;
  type: PrinterType;
  connectionType: ConnectionType;
  ipAddress: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

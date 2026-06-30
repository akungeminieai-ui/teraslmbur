// ============================================================
// Kitchen Types — Teras Lmbur OS
// ============================================================

import type { KitchenTicketStatus, PrinterTarget } from './enums';

/** Kitchen display ticket */
export interface KitchenTicket {
  id: string;
  orderId: string;
  status: KitchenTicketStatus;
  printer: PrinterTarget;
  priority: number;
  startedAt: string | null;
  completedAt: string | null;
  outletId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Physical/network printer device */
export interface Printer {
  id: string;
  name: string;
  type: PrinterTarget;
  ipAddress: string | null;
  port: number | null;
  isActive: boolean;
  outletId: string | null;
  createdAt: string;
}

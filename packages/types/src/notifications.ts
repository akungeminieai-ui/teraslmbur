// ============================================================
// Notification Types — Teras Lmbur OS
// ============================================================

import type { NotificationChannel } from './enums.js';

/** Notification entity */
export interface Notification {
  id: string;
  type: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  userId: string;
  createdAt: string;
}

/** Activity audit log */
export interface ActivityLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  userId: string;
  outletId: string | null;
  createdAt: string;
}

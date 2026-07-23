// ============================================================
// Settings & System Types — Teras Lmbur OS
// ============================================================

import type { OutletStatus } from './enums.js';

/** System setting key-value */
export interface Setting {
  id: string;
  key: string;
  value: string;
  group: string;
  outletId: string | null;
  updatedAt: string;
}

/** Outlet / branch — multi-outlet ready */
export interface Outlet {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  currency: string;
  timezone: string;
  logoUrl: string | null;
  status: OutletStatus;
  createdAt: string;
  updatedAt: string;
}

/** Decoupled Feature Flag toggle */
export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  updatedAt: string;
}

/** Media Storage File registry */
export interface Media {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  createdAt: string;
}

/** Deep Audit log for immutable events */
export interface AuditLog {
  id: string;
  action: string;
  resource: string;
  resourceId: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  device: string | null;
  userId: string;
  createdAt: string;
}

/** Dashboard widget grid positioning configuration */
export interface DashboardWidget {
  id: string;
  key: string;
  name: string;
  type: string;
  layout: Record<string, unknown>; // grid stack properties e.g. { w: 4, h: 2 }
  isActive: boolean;
  config: Record<string, unknown> | null;
}

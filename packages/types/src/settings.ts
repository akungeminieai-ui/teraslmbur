// ============================================================
// Settings Types — Teras Lmbur OS
// ============================================================

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
  name: string;
  address: string | null;
  phone: string | null;
  timezone: string;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

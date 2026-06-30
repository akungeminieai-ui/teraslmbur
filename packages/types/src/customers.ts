// ============================================================
// Customer Types — Teras Lmbur OS
// ============================================================

/** Customer profile */
export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  points: number;
  tier: string | null;
  outletId: string | null;
  createdAt: string;
  updatedAt: string;
}

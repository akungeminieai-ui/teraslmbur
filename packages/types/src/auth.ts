// ============================================================
// Auth Types — Teras Lmbur OS
// ============================================================

/** Granular permission codes — extensible via string intersection */
export type Permission =
  | 'products.create'
  | 'products.read'
  | 'products.update'
  | 'products.delete'
  | 'recipes.create'
  | 'recipes.read'
  | 'recipes.update'
  | 'recipes.delete'
  | 'sales.create'
  | 'sales.read'
  | 'categories.create'
  | 'categories.read'
  | 'categories.update'
  | 'categories.delete'
  | 'orders.create'
  | 'orders.read'
  | 'orders.update'
  | 'orders.void'
  | 'tables.create'
  | 'tables.read'
  | 'tables.update'
  | 'tables.delete'
  | 'inventory.read'
  | 'inventory.adjust'
  | 'inventory.manage'
  | 'reports.read'
  | 'reports.export'
  | 'users.read'
  | 'users.manage'
  | 'settings.read'
  | 'settings.update'
  | 'finance.read'
  | 'finance.manage'
  | 'kitchen.read'
  | 'kitchen.manage'
  | 'analytics.read'
  | (string & Record<never, never>); // Allow extension without losing autocomplete

/** Role with associated permissions */
export interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
}

/** Authenticated user */
export interface User {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  avatar: string | null;
  isActive: boolean;
  role: Role;
  outletId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** JWT token pair */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/** Login credentials */
export interface LoginCredentials {
  email: string;
  password: string;
}

/** Auth response from login */
export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

/** Token payload extracted from JWT */
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: string;
  permissions: Permission[];
  outletId: string | null;
  iat: number;
  exp: number;
}

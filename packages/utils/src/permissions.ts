import type { Permission } from '@teras-lmbur/types';
import { SystemRole } from '@teras-lmbur/types';

/**
 * Default permission sets for system roles.
 * These can be customized per installation but provide sane defaults.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<SystemRole, Permission[]> = {
  [SystemRole.OWNER]: [
    'products.create', 'products.read', 'products.update', 'products.delete',
    'categories.create', 'categories.read', 'categories.update', 'categories.delete',
    'orders.create', 'orders.read', 'orders.update', 'orders.void',
    'tables.create', 'tables.read', 'tables.update', 'tables.delete',
    'inventory.read', 'inventory.adjust', 'inventory.manage',
    'reports.read', 'reports.export',
    'users.read', 'users.manage',
    'settings.read', 'settings.update',
    'finance.read', 'finance.manage',
    'kitchen.read', 'kitchen.manage',
    'analytics.read',
  ],
  [SystemRole.MANAGER]: [
    'products.create', 'products.read', 'products.update',
    'categories.create', 'categories.read', 'categories.update',
    'orders.create', 'orders.read', 'orders.update', 'orders.void',
    'tables.create', 'tables.read', 'tables.update',
    'inventory.read', 'inventory.adjust',
    'reports.read', 'reports.export',
    'users.read',
    'settings.read',
    'finance.read',
    'kitchen.read', 'kitchen.manage',
    'analytics.read',
  ],
  [SystemRole.CASHIER]: [
    'products.read',
    'categories.read',
    'orders.create', 'orders.read', 'orders.update',
    'tables.read', 'tables.update',
    'finance.read',
    'kitchen.read',
  ],
  [SystemRole.KITCHEN]: [
    'orders.read',
    'kitchen.read', 'kitchen.manage',
    'inventory.read',
  ],
  [SystemRole.WAITER]: [
    'products.read',
    'categories.read',
    'orders.create', 'orders.read', 'orders.update',
    'tables.read', 'tables.update',
    'kitchen.read',
  ],
};

/** Check if a user has a specific permission */
export function hasPermission(userPermissions: Permission[], required: Permission): boolean {
  return userPermissions.includes(required);
}

/** Check if a user has at least one of the required permissions */
export function hasAnyPermission(userPermissions: Permission[], required: Permission[]): boolean {
  return required.some((p) => userPermissions.includes(p));
}

/** Check if a user has all of the required permissions */
export function hasAllPermissions(userPermissions: Permission[], required: Permission[]): boolean {
  return required.every((p) => userPermissions.includes(p));
}

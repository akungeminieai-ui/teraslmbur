# Teras Lmbur OS — Role Permissions Matrix

This document freezes the permission scopes and role mappings.

---

## 1. Permission Matrix

Permissions are granular scopes, preventing hardcoded roles in business code. Enforced via `hasPermission()` inside route guards.

| Permission Scope | OWNER | MANAGER | CASHIER | KITCHEN | WAITER | CUSTOMER |
|---|---|---|---|---|---|---|
| **orders:create** | Yes | Yes | Yes | No | Yes | Yes (QR) |
| **orders:void** | Yes | Yes | No | No | No | No |
| **orders:refund** | Yes | No | No | No | No | No |
| **kds:view** | Yes | Yes | No | Yes | No | No |
| **kds:update** | Yes | Yes | No | Yes | No | No |
| **inventory:adjust** | Yes | Yes | No | No | No | No |
| **finance:shift_open** | Yes | Yes | Yes | No | No | No |
| **finance:shift_close**| Yes | Yes | Yes | No | No | No |
| **finance:override** | Yes | No | No | No | No | No |
| **settings:update** | Yes | No | No | No | No | No |
| **reports:view** | Yes | Yes | No | No | No | No |
| **users:manage** | Yes | No | No | No | No | No |

---

## 2. Authorization Rules

- Roles **never hardcode permissions** directly in logic.
- The `hasPermission(user, requiredPermission)` method checks mapping definitions in the database.
- A user can be mapped to multiple roles, resolving to the union of permissions.

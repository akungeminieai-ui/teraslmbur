# ADR-006: Fine-Grained Permission-Based RBAC

## Status
Approved

## Context
Checking system access using static role labels (e.g. `if (role === 'CASHIER')`) is too rigid. If a store manager wants cashiers to perform refunds or edit product details temporarily, developers must write code updates to change the logic guards.

## Decision
We decouple system checks using a fine-grained, permission-based Role-Based Access Control (RBAC).
- We define a database table of atomic `Permission` records (e.g., `orders.void`, `products.update`).
- Roles (OWNER, CASHIER, MANAGER) are mapped to permissions through a `RolePermission` junction table.
- NestJS route controllers use `@RequirePermissions('orders.void')` to verify user capabilities.

## Consequences
- **Pros**: Dynamic and configurable permissions per role, zero security logic duplication, and flexible organizational hierarchies.
- **Cons**: Requires joining tables on user requests, mitigated by caching permissions inside the signed JWT payload.

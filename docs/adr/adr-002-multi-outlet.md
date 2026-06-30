# ADR-002: Multi-Outlet Database Tenancy

## Status
Approved

## Context
Teras Lmbur OS must support single-outlet operations initially but must scale to franchises running hundreds of parallel outlets with independent inventory, cash drawers, staff assignments, and printers.

## Decision
We enforce multi-outlet database design by scoping all operational records directly to an `Outlet` entity using an `outletId` foreign key.
- Shared global entities include: `Role`, `Permission`, `FeatureFlag`, `Unit`, `Category`, `Product`, `VariantGroup`, `ModifierGroup`, and `Tax`.
- Localized entities requiring `outletId` include: `User`, `Shift`, `Order`, `InventoryTransaction`, `Waste`, `KitchenStation`, `Printer`, `Expense`, and `Setting`.
- A default main outlet is automatically seeded to keep single-outlet setups immediate and frictionless.

## Consequences
- **Pros**: Data isolation between outlets at the application level, easy multi-tenant analytics, and support for centralized franchise dashboards.
- **Cons**: Development must consistently ensure queries include `outletId` filters to prevent cross-outlet data leakage.

# ADR-003: Transaction-Based Inventory Ledger

## Status
Approved

## Context
Updating a single `currentStock` column on an `Ingredient` table leads to race conditions under concurrent checkouts, provides no trace logs of who adjusted stock levels, and prevents recreating historical inventory snapshots for back-dated auditing.

## Decision
We enforce an immutable transaction-based inventory ledger (`InventoryTransaction` model).
- Stock is never mutated directly on the ingredients definition.
- Every stock adjustment, food sale, incoming purchase order, and waste event is written as a positive or negative adjustment row in `InventoryTransaction`.
- Current stock is calculated on-demand by summing the quantity delta in the transaction table or via daily cached snapshots.

## Consequences
- **Pros**: 100% audit accuracy, zero lock contention on the master ingredients table, and ability to reconstruct historical stock levels.
- **Cons**: High database row insertion rate. Querying current stock requires summing, which requires proper database index support.

# ADR-004: Versioned Bill of Materials (BOM) Recipes

## Status
Approved

## Context
When recipes are updated (e.g. changing salmon quantities due to price shifts), calculating historical cost of goods sold (COGS) using the new recipe yields incorrect historical financial logs. We must preserve historical recipe formulas.

## Decision
We implement a versioned Recipe BOM architecture.
- A `Product` has many `Recipes` (BOM instances).
- Each recipe has an incremental `version` number, `effectiveFrom` timestamp, `effectiveTo` timestamp, and `isActive` flag.
- When catalog recipes are updated, the previous version is marked inactive with an `effectiveTo` end date, and a new recipe version is created.
- Operations lookup the version matching the order's checkout date to determine the cost impact correctly.

## Consequences
- **Pros**: Historical financial audit integrity, correct COGS calculations, and clean version tracking.
- **Cons**: Minor database storage overhead to keep historical recipe versions.

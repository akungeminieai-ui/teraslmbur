# Teras Lmbur OS — Immutable Business Rules

This document freezes the core business invariants that the system must enforce at all layers.

---

## 1. POS & Orders Invariants

1. **Order Modification Constraints**:
   - An order **cannot be edited or modified** (adding/removing items or modifying options) once its status is `PAID` or `COMPLETED`.
   - Modifying a pending cart requires holding a lock or using session limits to prevent dual cashier modifications.
2. **Deletions Restriction**:
   - Completed, Voided, or Cancelled orders **cannot be deleted** from the database under any circumstances. They remain as historical audit nodes.

---

## 2. Inventory & Stock Invariants

1. **Double-Entry Stock Deductions**:
   - Stock balances **must never be adjusted directly** on the item entity.
   - All stock changes must go through an immutable ledger row (`InventoryLedger`). The current stock balance is the sum of ledger entries or verified by stock opname.
2. **Sale deductions (Automated BOM)**:
   - When a product is marked `PAID` or `QUEUED`, the system queries the **Bill of Materials (BOM) Recipe** definition and subtracts ingredients automatically from the parent outlet.

---

## 3. Financial & Precision Invariants

1. **Precision Math Rules**:
   - Monetary values **must never be stored or manipulated as floats** in logic.
   - All monetary calculations must use the `Money` Value Object (powered by integer scaling / bigint) to avoid rounding discrepancies.
2. **Dynamic Tax & Service Calculations**:
   - All taxes (VAT) and service charges are applied sequentially on base item prices. Calculations must not round values until the final aggregate receipt totals.

---

## 4. Platform & Infrastructure Rules

1. **Audit Logs Required**:
   - Every state change or mutation on a core business model (Order, Product, Shift, Ingredient) **requires writing an audit log** including request-id and correlation-id.
2. **Outlet Scoping Bound**:
   - Every transaction, user action, and ledger entry **must belong to an explicit Outlet** (tenant isolation).
3. **Operational Business Calendars**:
   - Every transaction date must resolve through `BusinessCalendarService` to map the action to the correct business date, rather than utilizing the local machine clock directly.
4. **Platform Service Enforcements**:
   - Every database counter numbering (order number, invoice code) must compile via `SequenceService`.
   - Every event must dispatch via `EventBusService`.
   - Every async background process must extend `QueueBase`.

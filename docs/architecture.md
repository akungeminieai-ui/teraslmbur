# Teras Lmbur OS — System Architecture & Design

This document details the system design, domain boundaries, data flows, and structural layout of the Teras Lmbur OS platform.

---

## 1. Monorepo Project Structure

We follow a modular monorepo structure managed via `pnpm` and **Turborepo**:

```
apps/
  ├── web/                     # Next.js 15 (App Router) Frontend
  └── api/                     # NestJS API Server
packages/
  ├── types/                   # Shared TypeScript models and enums
  ├── utils/                   # Shared validation, money, and date utils
  ├── hooks/                   # Shared React hooks library
  ├── config/                  # Shared ESLint/TSConfig templates
  └── ui/                      # Shared Tailwind v4 React widget kit
```

---

## 2. Core Business Layers

API controllers, service handlers, database models, and client components are structured under five high-level business divisions:

1. **Master Data (`master/`)**: Definitions and catalogs that change infrequently (products, units, reusable modifier groups, variants, versioned BOM recipes).
2. **Operations (`operations/`)**: Live restaurant activities (orders, tickets, floor plans, cashier shift sessions).
3. **Finance (`finance/`)**: Revenue tracking, payment method setups, cash closings, expenses, tax compliance.
4. **Analytics (`analytics/`)**: Summaries, reports, and widget layouts.
5. **System Settings (`system/`)**: RBAC permissions, audit ledgers, queue configurations, R2 media registries.

---

## 3. Core Foundational Flow Patterns

### Concurrency-Safe Sequencing
```
[Client App]
    │  (Post order check out request)
    ▼
[SequenceService] ──► (SELECT current FROM "Sequence" WHERE key=order FOR UPDATE)
    │  (Row locked. Increment counter safely)
    ▼
[Database Transaction] ──► (Commit updated sequence, release lock)
    │  (Return ORD-YYYYMMDD-XXXX string)
    ▼
[Client Response]
```

### Business Date offset logic
```
Real Timestamp: 2026-07-02 01:30:00 (1:30 AM)
Store Day Start: 06:00 (6 AM)
Offset check: 01:30 < 06:00 ? True
Resulting Business Date: 2026-07-01 (belongs to yesterday's operations)
```
All financial analytics, sales records, and cashier closings filter using this calculated business date.

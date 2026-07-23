# Teras Lmbur OS — Restaurant Management System (RMS) ERP

Teras Lmbur OS is a production-ready, enterprise-grade Restaurant Management System designed to scale from a single outlet to a multi-outlet franchise platform.

---

## 🚀 Key Architectural Features

1. **Clean Architecture & DDD**: Grouped into five distinct business domains: `master`, `operations`, `finance`, `analytics`, and `system`.
2. **Enterprise Translation Engine (v1.1)**: Database-driven translation tables (`ProductTranslation`, `CategoryTranslation`, etc.) with in-memory locale fallbacks, decoupling text from DB structures.
3. **Enterprise Configuration Registry (v1.1)**: Metadata-driven system settings (`SettingDefinition` + `SettingValue`) supporting type validations and groups.
4. **Dynamic Theme Token System (v1.1)**: Dynamic branding customization (logos, dimensions, typography, and theme token palettes) outputting native CSS variables directly to the UI.
5. **Redis Caching Layer (v1.1)**: Global settings cache utilizing Redis to yield sub-millisecond lookups with active TTL invalidations.
6. **Concurrency-Safe Sequence Engine (v1.0)**: Custom numbering engine utilizing `SELECT ... FOR UPDATE` row locks to prevent duplicate order or invoice numbering under high checkout volume.
7. **Operational Business Calendar (v1.0)**: Configurable start-hour offsets (defaulting to 6:00 AM) that map calendar timestamps correctly to store operational days.
8. **Transaction-Based Inventory Ledger**: All ingredient stock updates are written as immutable ledger rows in the transaction history table to ensure audit trail integrity.
9. **Normalised Variants & Modifiers**: Product options are managed through reusable templates (`VariantGroup`, `ModifierGroup`) to prevent database bloat.
10. **BullMQ Background Queues**: Asynchronous execution for printing, notifications, and slow reporting routines.
11. **Pino Structured Logging & RBAC**: Automated Audit logs and fine-grained role mapping checks.
12. **Product Price History Audit Logs**: Immutable history logging capturing prior sellingPrice, HPP, actor, and reasons inside atomic database transactions.

---

## 📁 Repository Directory Map

```
├── apps/
│   ├── web/                    # Next.js 15 (App Router) Frontend App
│   └── api/                    # NestJS API Server
├── packages/
│   ├── types/                  # Shared TypeScript models and enums
│   ├── utils/                  # Shared currency, calculation, and date utilities
│   ├── hooks/                  # Shared React hook integrations
│   ├── config/                 # ESLint and TypeScript compilation presets
│   └── ui/                     # Shared TailwindCSS v4 React widget library
├── docs/
│   ├── adr/                    # Architectural Decision Records (ADRs 001 - 010)
│   ├── architecture.md         # System boundaries and flow patterns
│   ├── development_guide.md    # Installation and coding instructions
│   ├── contributing.md         # Git guidelines and contribution checks
│   └── production_checklist.md # Railway, Vercel, Neon and CF R2 setups
└── package.json                # Root workspaces package registry
```

---

## ⚡ Development Setup

Please refer to the detailed [Developer Setup Guide](file:///Users/a/Desktop/Teras%20Lmbur/docs/development_guide.md) to bootstrap the workspace.

Quick commands:
```bash
# 1. Install workspace dependencies
pnpm install

# 2. Generate Prisma Client
pnpm --filter @teras-lmbur/api prisma:generate

# 3. Compile and build the entire monorepo
pnpm turbo build

# 4. Start local development environment
pnpm dev
```
Navigate to `http://localhost:3000` to load the client dashboard.
All API endpoints are documented automatically using Swagger at `http://localhost:3001/docs`.

# Teras Lmbur OS — Developer & Configuration Guide

This guide assists new developers setting up the development workspace, understanding code styles, and writing new modules.

---

## 1. Local Workspace Setup

### Prerequisites
- Node.js v20+ or v24
- `pnpm` (v11+)
- PostgreSQL (database instance URL required)
- Redis (for background queue tasks)

### Setup Steps
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Populate the database and redis connection keys:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/teras_lmbur"
   REDIS_URL="redis://localhost:6379"
   JWT_SECRET="supersecretkeyhere"
   JWT_REFRESH_SECRET="superrefreshsecretkeyhere"
   ```
3. Install project dependencies:
   ```bash
   pnpm install
   ```
4. Generate the database prisma client:
   ```bash
   pnpm --filter @teras-lmbur/api prisma:generate
   ```
5. Seed initial data:
   ```bash
   pnpm --filter @teras-lmbur/api prisma:seed
   ```
6. Run the local dev server:
   ```bash
   pnpm dev
   ```

---

## 2. Shared Development Standards

- **TypeScript Strictness**: Enforced via workspace base config. Do not bypass checks with `any` unless mapping third-party typings (such as JWT expirations).
- **Decimal for Cash**: Never use floating points (`number` in JS, `float` in SQL) for prices, tax calculations, or cash drawer balances. Always use `@db.Decimal(12,2)` in Prisma and represent them as strings in types.
- **Spinners**: Do not use loading spinners for page transitions. Always implement dynamic skeleton elements (`TableRowSkeleton`, `PageSkeleton`) for better visual perception.
- **Git Commit Rules**: Write formatted commits (e.g. `feat(orders): ...`, `fix(auth): ...`, `chore(deps): ...`).

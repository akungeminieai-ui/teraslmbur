# ADR-005: Payment Method Master Registry

## Status
Approved

## Context
Hardcoding payment methods as a fixed database enum prevents the operational setup of local payment channels (like Vodafone Cash or InstaPay in Egypt, or local mobile wallets in franchise locations) without code redeployments.

## Decision
We replace hardcoded payment method enums with a dynamic `PaymentMethod` master database table.
- Database records hold: `id`, `name`, `code` (e.g. `VODAFONE_CASH`), `type` (CASH, CARD, E_WALLET), and `isActive`.
- Adding new wallets or cards is done by creating rows in the registry, which then dynamically render as active checkout options on the cashier terminal.

## Consequences
- **Pros**: Dynamic payment channel management, localized currency compliance, and zero code changes when introducing new payment gateways.
- **Cons**: Requires mapping payment logs to dynamic foreign keys rather than static enum strings.

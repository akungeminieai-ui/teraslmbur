# ADR-001: Domain-Driven Design (DDD) Pattern

## Status
Approved

## Context
A Restaurant Management System (RMS) grows into a complete enterprise ERP. Building it as an unstructured MVC or generic CRUD database application leads to high coupling, overlapping business rules, and high refactoring costs as new modules (membership, POS, supply chain) are introduced.

## Decision
We enforce a Domain-Driven Design (DDD) directory and structural architecture for all core business capabilities.
- Presentation, Application, Domain, and Infrastructure layers are isolated.
- High-level groupings separate domains into clean business domains: `master`, `operations`, `finance`, `analytics`, `system`.
- Domain layer holds pure business rules, enums, interfaces, and aggregates with zero dependencies on outer infrastructural layers (Prisma, NestJS, Express).

## Consequences
- **Pros**: Strong decoupling, high maintainability, isolated domain testing, and easy module replacement.
- **Cons**: Slightly higher boilerplate code volume initially to translate database models to domain aggregates.

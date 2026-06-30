# ADR-010: Database Lock-Based Sequence Generator

## Status
Approved

## Context
Relying on auto-increment IDs or `count()` queries to generate order codes like `ORD-001` leads to concurrency duplication errors when multiple cashiers place orders at the same millisecond. Additionally, sequence generation must prevent number gaps.

## Decision
We implement a dedicated, database-level sequence generator (`SequenceService`).
- We record a `Sequence` state row keeping the current counter value mapped to a `key`, `outletId`, and `date`.
- We execute sequence increments inside a transaction block using PostgreSQL row locks (`SELECT ... FOR UPDATE`).
- This blocks concurrent updates to the same counter, ensuring that each thread receives a unique, sequential number.
- Configurability is supported using format strings saved in the settings.

## Consequences
- **Pros**: Gapless, concurrency-safe, unique transaction-safe sequence numbering.
- **Cons**: Minor performance lock overhead under massive simultaneous checkout spikes, scoped by outlet and date.

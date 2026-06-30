# ADR-007: Redis BullMQ Queue Architecture

## Status
Approved

## Context
Restaurant operations require executing time-consuming, slow, or network-dependent tasks (such as sending a receipt to WhatsApp, generating PDF end-of-day reports, or dispatching printer network packages). Handling these tasks synchronously blocks the core execution thread, slowing down POS cashier checkouts.

## Decision
We implement a queueing architecture using Redis and BullMQ.
- During application startup, we register three dedicated queues:
  1. `PrintQueue`: Serializes and handles print commands to network hardware.
  2. `NotificationQueue`: Handles email, push notifications, and messaging webhooks.
  3. `ReportQueue`: Processes slow background analytical report aggregations.
- NestJS API controllers push jobs to these queues, returning instantly to the client.

## Consequences
- **Pros**: Sub-second API response times, automatic retry policies for network failures, and offloaded system processing.
- **Cons**: Introducing Redis adds an infrastructure dependency.

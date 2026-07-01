# Teras Lmbur OS — Payment Lifecycle Blueprint

This document freezes the multi-payment configurations, checkout payment states, and split-payment transactions rules.

---

## 1. Payment Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING : Payment record generated
    PENDING --> PAID : Transaction completed
    PENDING --> PARTIALLY_PAID : Partial amount processed
    PENDING --> FAILED : Payment declined / timed out
    
    PARTIALLY_PAID --> PAID : Remainder amount settled
    PARTIALLY_PAID --> FAILED : Partial balance settling failed
    PARTIALLY_PAID --> VOIDED : Transaction voided by cashier
    
    PAID --> REFUNDED : Customer refund approved
    PAID --> VOIDED : Mistake registered before day end
    
    FAILED --> [*]
    REFUNDED --> [*]
    VOIDED --> [*]
```

---

## 2. Multi-Payment & Split-Payment Rules

Teras Lmbur OS supports splitting a single invoice across multiple payment methods:

1. **Split Allocation**:
   - The user selects amounts to allocate across payment methods.
   - Example: 50% Cash + 50% Bank Transfer.
2. **State Rules**:
   - The overall order stays in `PENDING_PAYMENT` until all split payment records sum to the total bill amount.
   - Each payment transaction has its own immutable `PaymentStatus` (PENDING, PAID, FAILED).
   - If split payments are partially completed, the order has status `PENDING_PAYMENT` and total payments are registered, but the order is not yet marked `PAID`.
3. **Database-Driven Providers**:
   - Supported payment methods are loaded from the database: `Cash`, `InstaPay`, `Bank Transfer`, `Visa`, `Mastercard`, and `Wallet`.
   - Adding a payment provider does not require database migration (configuration registry driven).

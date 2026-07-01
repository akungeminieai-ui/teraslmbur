# Teras Lmbur OS — Enterprise State Machines

This document compiles the Mermaid state machine diagrams governing the system workflows.

---

## 1. Table Lifecycle State Machine

Defines the seating status and ordering progression for dining tables.

```mermaid
stateDiagram-v2
    [*] --> AVAILABLE : Initial State
    AVAILABLE --> RESERVED : Booking received
    AVAILABLE --> SEATED : Walk-in customer seated
    
    RESERVED --> SEATED : Reserved customer arrives
    RESERVED --> AVAILABLE : Reservation cancelled / no-show
    
    SEATED --> ORDERING : Cart created / menu scanned
    
    ORDERING --> DINING : Order sent to kitchen
    
    DINING --> PAYMENT : Bill printed / request checkout
    
    PAYMENT --> DIRTY : Payment successful / customer leaves
    
    DIRTY --> CLEANING : Busser starts table cleaning
    
    CLEANING --> AVAILABLE : Cleaned and sanitized
```

---

## 2. Order Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> DRAFT
    DRAFT --> PENDING_PAYMENT
    DRAFT --> CANCELLED
    PENDING_PAYMENT --> PAID
    PENDING_PAYMENT --> CANCELLED
    PAID --> QUEUED
    PAID --> REFUNDED
    QUEUED --> PREPARING
    QUEUED --> VOIDED
    PREPARING --> READY
    PREPARING --> VOIDED
    READY --> SERVED
    SERVED --> COMPLETED
    SERVED --> REFUNDED
```

---

## 3. Kitchen Production Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> WAITING
    WAITING --> ACCEPTED
    WAITING --> CANCELLED
    ACCEPTED --> PREPARING
    ACCEPTED --> CANCELLED
    PREPARING --> READY
    PREPARING --> CANCELLED
    READY --> PICKED_UP
```

---

## 4. Cashier Shift State Machine

```mermaid
stateDiagram-v2
    [*] --> OPENING
    OPENING --> ACTIVE
    ACTIVE --> CLOSING
    CLOSING --> CLOSED
    CLOSING --> REOPENED
    REOPENED --> ACTIVE
```

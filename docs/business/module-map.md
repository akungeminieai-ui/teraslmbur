# Teras Lmbur OS — Module Dependency Map

This document freezes the dependency boundaries and import rules across modules.

---

## 1. Module Dependency Graph

Clean architecture requires dependencies to flow in a single direction. Higher-level domains must not depend on lower-level ones.

```mermaid
graph TD
    subgraph Analytics Domain
        analytics[analytics module]
    end

    subgraph Finance Domain
        finance[finance module]
    end

    subgraph Operations Domain
        operations[operations module]
    end

    subgraph Master Domain
        master[master module]
    end

    subgraph System Domain (Platform Core)
        system[system module]
    end

    %% Dependency Directions
    analytics --> finance
    analytics --> operations
    analytics --> master
    
    finance --> operations
    finance --> master
    
    operations --> master
    
    master --> system
    finance --> system
    operations --> system
    analytics --> system
```

---

## 2. Boundary Rules

1. **System Module Isolation**:
   - The `system` module (RequestContext, EventBus, Cache, Storage, QueueBase, Sequences) **must never import** any entities or services from `master`, `operations`, `finance`, or `analytics`.
2. **Operations & Master Isolation**:
   - The `master` catalog module (Products, Category, Variants, Recipe) **must not import** operations variables (Orders, Payments, KDS Tickets).
3. **Circular Dependencies forbidden**:
   - Any circular dependency between modules (e.g. `operations` importing `finance` while `finance` imports `operations`) is an architecture violation.

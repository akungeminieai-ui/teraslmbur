# ADR-009: Business Calendar Operational Dates

## Status
Approved

## Context
Restaurants frequently run operations past calendar midnight (e.g., closing at 2:00 AM or 3:00 AM). Invoicing an order checked out at 1:30 AM on July 2nd to the calendar date "July 2nd" skews sales reporting, shifts balances, and cash drawer closings for the "July 1st" operational business day.

## Decision
We enforce an operational `BusinessDate` calendar mapping system.
- Outlets define a `business_day_start_hour` setting (e.g. `06:00` AM).
- Any transactions occurring between `06:00` calendar date $D$ and `05:59` calendar date $D+1$ are mapped to the operational `BusinessDate` $D$.
- The `BusinessCalendarService` handles this translation on every write or report generation.

## Consequences
- **Pros**: Accurate financial reports matching shift rosters, correct cash closing calculations, and compliance with restaurant accounting standards.
- **Cons**: Timestamp parsing requires offset logic adjustments on all analytical queries.

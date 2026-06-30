# ADR-008: Printer Station Routing

## Status
Approved

## Context
A single kitchen printer is insufficient for large outlets. An order containing a grill item, a sushi item, and a milkshake must automatically split into three tickets and route to three different physical hardware units (Kitchen grill, Sushi bar, Beverage bar) instantly.

## Decision
We decouple printer routing by implementing `KitchenStation` models.
- An outlet defines multiple `KitchenStation` records (Grill, Bar, Dessert).
- Products are linked to specific kitchen stations.
- `Printer` records hold connection settings (NETWORK IP, USB port, BLUETOOTH mac address) and point to a specific `KitchenStation`.
- When an order is confirmed, the system splits order lines by station, generates isolated `KitchenTicket` cards, and routes them to the associated printers.

## Consequences
- **Pros**: Automated tickets routing, independent station tracking, and hardware decoupling.
- **Cons**: Requires mapping catalog items to stations accurately.

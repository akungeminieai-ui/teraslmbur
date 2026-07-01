# Teras Lmbur OS — Dashboard Widget Registry

This document freezes the operational dashboard widgets and configuration metadata.

---

## 1. Registered Dashboard Widgets

Every widget is dynamic and customizable per user role or view preference.

| Widget Key | Widget Name | Primary Metric | Role Visibility |
|---|---|---|---|
| **WIDGET_REVENUE** | Net Revenue | Local currency formatted sales total | OWNER, MANAGER |
| **WIDGET_ORDERS** | Total Orders | Count of completed and preparing orders | OWNER, MANAGER, CASHIER |
| **WIDGET_AVG_TICKET** | Average Ticket Size | Net Revenue / Completed Orders | OWNER, MANAGER |
| **WIDGET_KITCHEN_QUEUE** | Kitchen Queue status | Count of active tickets in WAITING / PREPARING | MANAGER, KITCHEN |
| **WIDGET_TOP_PRODUCTS** | Top Selling Products | List of top 5 products with quantity | OWNER, MANAGER |
| **WIDGET_EXPENSES** | Shift Expenses | Ledger sum of cash-out adjustments | OWNER, MANAGER |
| **WIDGET_GROSS_PROFIT** | Gross Profit Margin | Gross Profit / Net Sales percentage | OWNER |
| **WIDGET_NET_PROFIT** | Net Profit Margin | Net Profit / Net Sales percentage | OWNER |
| **WIDGET_CASH_DRAWER** | Cash Drawer Status | Current cashier drawer balance vs expected | OWNER, MANAGER, CASHIER |
| **WIDGET_ACTIVE_TABLES** | Active Tables | Occupied/Ordering tables count | MANAGER, WAITER |
| **WIDGET_DELIVERY** | Delivery Orders | Delivery (Tausil) orders list | MANAGER, CASHIER |
| **WIDGET_STOCK_ALERTS** | Inventory Stock Warnings | List of ingredients below warning threshold | MANAGER |

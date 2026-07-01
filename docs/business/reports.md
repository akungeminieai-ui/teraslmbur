# Teras Lmbur OS — Enterprise Report Definitions

This document freezes the calculations and specifications for the platform reports.

---

## 1. Consolidated Financial Reports

### Daily Sales Summary
- **Purpose**: Tracks operational sales performance.
- **Formula**:
  $$\text{Net Sales} = \text{Gross Sales} - \text{Discounts} - \text{Refunds}$$
- **Data Scope**: Filtered by operational business date.

### Gross Profit & COGS (Cost of Goods Sold)
- **Purpose**: Evaluates menu item margin efficiencies.
- **Formulas**:
  $$\text{COGS} = \sum (\text{Ingredient Unit Cost} \times \text{Ingredient Recipe Quantity})$$
  $$\text{Gross Profit} = \text{Net Sales} - \text{COGS}$$

### Net Profit Report
- **Purpose**: Overall store profitability analysis.
- **Formula**:
  $$\text{Net Profit} = \text{Gross Profit} - \text{Expenses} - \text{Taxes}$$

---

## 2. Inventory & Expenses Reports

### Inventory Movement Ledger
- **Purpose**: Full auditing trail of stock levels.
- **Columns**: Business Date, Ingredient, Transaction Type, Source, Destination, Quantity, Operator ID.

### Waste Report
- **Purpose**: Audits raw item losses due to spoilage, burns, or cashier error.
- **Metrics**: Total Waste Weight, Waste Cost, Waste Ratio (Waste Cost / Gross Sales).

---

## 3. Operations & Analytics Reports

### Top & Slow Moving Menu
- **Purpose**: Identifies highly popular items versus dead stock.
- **KPIs**: Sales Count, Contribution Margin, Category Rank.

### Kitchen Performance Analytics
- **Purpose**: Tracks prep speed.
- **KPIs**: Average Prep Duration (WAITING ➔ READY), Overtime Tickets Count, Station Efficiency.

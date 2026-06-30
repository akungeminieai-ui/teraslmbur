import type { Metadata } from 'next';
import { Warehouse, AlertTriangle, ArrowDownUp } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';

export const metadata: Metadata = { title: 'Inventory' };

const inventoryItems = [
  { name: 'Coffee Bean (Arabica)', stock: '1.2', unit: 'Kg', min: '3', cost: '120 EGP/Kg', status: 'critical' },
  { name: 'Milk (Fresh)', stock: '2.5', unit: 'Liters', min: '5', cost: '35 EGP/L', status: 'critical' },
  { name: 'Sugar', stock: '3.8', unit: 'Kg', min: '5', cost: '22 EGP/Kg', status: 'warning' },
  { name: 'Cup (Medium)', stock: '15', unit: 'Pieces', min: '50', cost: '1.5 EGP', status: 'warning' },
  { name: 'Rice (Japanese)', stock: '8.5', unit: 'Kg', min: '5', cost: '85 EGP/Kg', status: 'ok' },
  { name: 'Nori Sheets', stock: '45', unit: 'Pieces', min: '20', cost: '3 EGP', status: 'ok' },
  { name: 'Salmon (Fresh)', stock: '4.2', unit: 'Kg', min: '2', cost: '280 EGP/Kg', status: 'ok' },
  { name: 'Soy Sauce', stock: '3', unit: 'Bottles', min: '2', cost: '45 EGP', status: 'ok' },
];

const statusIndicator: Record<string, string> = {
  critical: 'bg-danger-500',
  warning: 'bg-warning-500',
  ok: 'bg-success-500',
};

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Track stock levels, manage ingredients, and monitor low-stock alerts."
        icon={Warehouse}
        actions={
          <button className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600">
            <ArrowDownUp className="h-4 w-4" />
            Stock Adjustment
          </button>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
          <p className="text-xs font-medium text-[var(--muted-foreground)]">Total Items</p>
          <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">{inventoryItems.length}</p>
        </div>
        <div className="rounded-xl border border-danger-500/20 bg-[var(--card)] p-5">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-danger-500" />
            <p className="text-xs font-medium text-danger-500">Critical</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-danger-500">
            {inventoryItems.filter((i) => i.status === 'critical').length}
          </p>
        </div>
        <div className="rounded-xl border border-warning-500/20 bg-[var(--card)] p-5">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-warning-500" />
            <p className="text-xs font-medium text-warning-500">Low Stock</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-warning-500">
            {inventoryItems.filter((i) => i.status === 'warning').length}
          </p>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left">
              <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">Status</th>
              <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">Ingredient</th>
              <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">Current Stock</th>
              <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">Min Stock</th>
              <th className="px-5 py-3 text-right font-medium text-[var(--muted-foreground)]">Unit Cost</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {inventoryItems.map((item) => (
              <tr key={item.name} className="transition-colors hover:bg-[var(--accent)]/50">
                <td className="px-5 py-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${statusIndicator[item.status]}`} />
                </td>
                <td className="px-5 py-3 font-medium text-[var(--foreground)]">{item.name}</td>
                <td className="px-5 py-3 text-[var(--foreground)]">{item.stock} {item.unit}</td>
                <td className="px-5 py-3 text-[var(--muted-foreground)]">{item.min} {item.unit}</td>
                <td className="px-5 py-3 text-right text-[var(--muted-foreground)]">{item.cost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

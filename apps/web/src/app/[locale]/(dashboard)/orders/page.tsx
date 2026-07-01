import type { Metadata } from 'next';
import { ShoppingCart } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { OrderStatus } from '@teras-lmbur/types';

export const metadata: Metadata = { title: 'Orders' };

const dummyOrders = [
  { code: 'ORD-001', customer: 'Hilal Achmad', type: 'Dine In', table: 'Table 19', items: 5, status: OrderStatus.PREPARING, total: '16.22 EGP', time: '14:32' },
  { code: 'ORD-002', customer: 'Steve Houdini', type: 'Dine In', table: 'Table 9', items: 9, status: OrderStatus.QUEUED, total: '24.50 EGP', time: '14:28' },
  { code: 'ORD-003', customer: 'Maulana Ragnar', type: 'Dine In', table: 'Table 12', items: 12, status: OrderStatus.COMPLETED, total: '35.80 EGP', time: '14:15' },
  { code: 'ORD-004', customer: 'Sara Ahmed', type: 'Take Away', table: '-', items: 3, status: OrderStatus.READY, total: '12.40 EGP', time: '14:10' },
  { code: 'ORD-005', customer: 'Yuki Tanaka', type: 'Delivery', table: '-', items: 7, status: OrderStatus.SERVED, total: '42.60 EGP', time: '13:55' },
  { code: 'ORD-006', customer: 'Ahmad Faisal', type: 'Dine In', table: 'Table 5', items: 4, status: OrderStatus.PENDING_PAYMENT, total: '18.90 EGP', time: '13:48' },
  { code: 'ORD-007', customer: 'Walk-in', type: 'Take Away', table: '-', items: 2, status: OrderStatus.CANCELLED, total: '8.50 EGP', time: '13:30' },
];

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Track and manage all incoming orders."
        icon={ShoppingCart}
      />
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left">
                <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">Order</th>
                <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">Customer</th>
                <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">Type</th>
                <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">Table</th>
                <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">Items</th>
                <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">Status</th>
                <th className="px-5 py-3 text-right font-medium text-[var(--muted-foreground)]">Total</th>
                <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {dummyOrders.map((order) => (
                <tr key={order.code} className="transition-colors hover:bg-[var(--accent)]/50">
                  <td className="px-5 py-3 font-mono text-xs text-brand-500">{order.code}</td>
                  <td className="px-5 py-3 font-medium text-[var(--foreground)]">{order.customer}</td>
                  <td className="px-5 py-3 text-[var(--muted-foreground)]">{order.type}</td>
                  <td className="px-5 py-3 text-[var(--muted-foreground)]">{order.table}</td>
                  <td className="px-5 py-3 text-[var(--muted-foreground)]">{order.items}</td>
                  <td className="px-5 py-3"><StatusBadge status={order.status} /></td>
                  <td className="px-5 py-3 text-right font-medium text-[var(--foreground)]">{order.total}</td>
                  <td className="px-5 py-3 text-[var(--muted-foreground)]">{order.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

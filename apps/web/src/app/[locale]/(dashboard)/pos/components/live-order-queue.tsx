'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { OrderCard } from './order-card';

interface SaleItem {
  id: string;
  quantity: number;
}

interface SaleHistoryItem {
  id: string;
  code: string;
  createdAt: string;
  notes?: string | null;
  status?: string;
  isPriority?: boolean;
  isPaid?: boolean;
  items: SaleItem[];
  user?: { name: string };
  customerName?: string | null;
  tableNumber?: string | number | null;
  orderType?: string | null;
}

interface LiveOrderQueueProps {
  sales: SaleHistoryItem[];
  isLoading: boolean;
  onSelectOrder?: (sale: SaleHistoryItem) => void;
}

function parseSaleNotes(notesStr?: string | null) {
  let customer = 'Walk-in';
  let table = 'Takeaway';

  if (notesStr) {
    const trimmed = notesStr.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        customer = parsed.customerName || 'Walk-in';
        if (parsed.orderType === 'DELIVERY') {
          table = 'Delivery';
        } else {
          table = parsed.tableNumber ? `Table ${parsed.tableNumber}` : 'Takeaway';
        }
      } catch {
        customer = notesStr;
      }
    } else {
      customer = notesStr;
    }
  }
  return { customer, table };
}

function getElapsedTime(createdAtStr?: string): string {
  if (!createdAtStr) return 'Just now';
  const created = new Date(createdAtStr);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  if (isNaN(diffMs) || diffMs < 0) return 'Just now';
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export function LiveOrderQueue({ sales, isLoading, onSelectOrder }: LiveOrderQueueProps) {
  if (isLoading) {
    return (
      <div className="flex h-[120px] items-center justify-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-6">
        <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
        <span className="text-xs font-semibold text-[var(--muted-foreground)]">
          Loading live transaction feed...
        </span>
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="flex h-[120px] items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)]/40 px-6">
        <span className="text-xs font-semibold text-[var(--muted-foreground)]">
          No transactions processed today
        </span>
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[var(--border)] max-w-full">
      {sales.slice(0, 10).map((sale) => {
        let { customer, table } = parseSaleNotes(sale.notes);
        if (sale.customerName) {
          customer = sale.customerName;
        }
        if (sale.tableNumber !== undefined && sale.tableNumber !== null) {
          table = `Table ${sale.tableNumber}`;
        } else if (sale.orderType === 'DELIVERY') {
          table = 'Delivery';
        } else if (sale.orderType === 'TAKE_AWAY') {
          table = 'Takeaway';
        }

        const totalItems = sale.items ? sale.items.reduce((sum, item) => sum + item.quantity, 0) : 0;
        const elapsed = getElapsedTime(sale.createdAt);

        return (
          <OrderCard
            key={sale.id}
            id={sale.id}
            code={sale.code}
            customerName={customer}
            table={table}
            itemCount={totalItems}
            status={!sale.isPaid ? 'PENDING' : (sale.status || 'COMPLETED')}
            elapsedTime={elapsed}
            isPriority={sale.isPriority}
            onClick={() => onSelectOrder?.(sale)}
          />
        );
      })}
    </div>
  );
}

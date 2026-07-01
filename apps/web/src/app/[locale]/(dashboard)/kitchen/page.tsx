import type { Metadata } from 'next';
import { ChefHat, Clock, Flame } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';

export const metadata: Metadata = { title: 'Kitchen' };

const kitchenTickets = [
  {
    code: 'ORD-001',
    table: 'Table 19',
    customer: 'Hilal Achmad',
    items: ['Sashimi x1', 'Okonomiyaki x1', 'Tamagoyaki x2', 'Noodles Ramen x1'],
    time: '12 min',
    priority: 'high',
  },
  {
    code: 'ORD-002',
    table: 'Table 9',
    customer: 'Steve Houdini',
    items: ['Makizushi x3', 'Chicken Donburi x2', 'Yakitori x2', 'Curry Rice x2'],
    time: '8 min',
    priority: 'normal',
  },
  {
    code: 'ORD-006',
    table: 'Table 5',
    customer: 'Ahmad Faisal',
    items: ['Latte x2', 'Tamagoyaki x1', 'Sashimi x1'],
    time: '3 min',
    priority: 'normal',
  },
];

const priorityStyles: Record<string, string> = {
  high: 'border-danger-500/40 bg-danger-500/5',
  normal: 'border-[var(--border)]',
};

export default function KitchenPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Kitchen Display"
        description="Real-time kitchen ticket queue for order preparation."
        icon={ChefHat}
      />

      {/* Kitchen Stats */}
      <div className="flex items-center gap-6 rounded-xl border border-[var(--border)] bg-[var(--card)] px-6 py-4">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-brand-500" />
          <span className="text-sm font-medium text-[var(--foreground)]">Active Tickets</span>
          <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-xs font-bold text-brand-500">
            {kitchenTickets.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[var(--muted-foreground)]" />
          <span className="text-sm text-[var(--muted-foreground)]">Avg Wait: 8 min</span>
        </div>
      </div>

      {/* Ticket Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {kitchenTickets.map((ticket) => (
          <div
            key={ticket.code}
            className={`rounded-xl border-2 bg-[var(--card)] p-5 transition-all hover:shadow-lg ${priorityStyles[ticket.priority]}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-xs text-brand-500">{ticket.code}</span>
                <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">{ticket.customer}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{ticket.table}</p>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-[var(--muted)] px-2.5 py-1 text-xs font-medium text-[var(--muted-foreground)]">
                <Clock className="h-3 w-3" />
                {ticket.time}
              </div>
            </div>
            <div className="mt-4 space-y-1.5">
              {ticket.items.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 rounded-lg bg-[var(--background)] px-3 py-1.5 text-sm text-[var(--foreground)]"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button className="flex-1 rounded-lg bg-brand-500 py-2 text-xs font-medium text-white transition-colors hover:bg-brand-600">
                Start
              </button>
              <button className="flex-1 rounded-lg border border-[var(--border)] py-2 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--accent)]">
                Done
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

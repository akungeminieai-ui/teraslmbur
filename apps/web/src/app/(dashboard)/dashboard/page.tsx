import type { Metadata } from 'next';
import {
  DollarSign,
  ShoppingCart,
  ChefHat,
  Coffee,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Clock,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { OrderStatus } from '@teras-lmbur/types';

export const metadata: Metadata = {
  title: 'Dashboard',
};

// ── Realistic Dummy Data ──
const stats = [
  {
    label: 'Revenue',
    value: '18,250 EGP',
    trend: { value: 12.5, direction: 'up' as const, label: 'vs last week' },
    icon: DollarSign,
  },
  {
    label: 'Orders',
    value: '128',
    trend: { value: 8.3, direction: 'up' as const, label: 'vs yesterday' },
    icon: ShoppingCart,
  },
  {
    label: 'Kitchen Queue',
    value: '9',
    trend: { value: 2, direction: 'down' as const, label: 'avg wait 12m' },
    icon: ChefHat,
  },
  {
    label: "Today's Profit",
    value: '6,480 EGP',
    trend: { value: 15.2, direction: 'up' as const, label: 'vs last week' },
    icon: TrendingUp,
  },
];

const recentOrders = [
  {
    code: 'ORD-20260101-001',
    customer: 'Hilal Achmad',
    table: 'Table 19',
    items: 5,
    status: OrderStatus.PREPARING,
    total: '16.22 EGP',
    time: '2 min ago',
  },
  {
    code: 'ORD-20260101-002',
    customer: 'Steve Houdini',
    table: 'Table 9',
    items: 9,
    status: OrderStatus.CONFIRMED,
    total: '24.50 EGP',
    time: '5 min ago',
  },
  {
    code: 'ORD-20260101-003',
    customer: 'Maulana Ragnar',
    table: 'Table 12',
    items: 12,
    status: OrderStatus.COMPLETED,
    total: '35.80 EGP',
    time: '12 min ago',
  },
  {
    code: 'ORD-20260101-004',
    customer: 'Sara Ahmed',
    table: 'Table 3',
    items: 3,
    status: OrderStatus.READY,
    total: '12.40 EGP',
    time: '18 min ago',
  },
  {
    code: 'ORD-20260101-005',
    customer: 'Yuki Tanaka',
    table: 'Take Away',
    items: 7,
    status: OrderStatus.ON_DELIVERY,
    total: '42.60 EGP',
    time: '25 min ago',
  },
];

const lowStockItems = [
  { name: 'Milk', current: '2.5', unit: 'Liters', min: '5', severity: 'critical' },
  { name: 'Coffee Bean', current: '1.2', unit: 'Kg', min: '3', severity: 'critical' },
  { name: 'Cup (Medium)', current: '15', unit: 'Pieces', min: '50', severity: 'warning' },
  { name: 'Sugar', current: '3.8', unit: 'Kg', min: '5', severity: 'warning' },
];

const bestSellers = [
  { name: 'Latte', sold: 48, revenue: '240 EGP' },
  { name: 'Sashimi', sold: 35, revenue: '159.60 EGP' },
  { name: 'Noodles Ramen', sold: 28, revenue: '105.28 EGP' },
  { name: 'Tamagoyaki', sold: 22, revenue: '52.80 EGP' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here's what's happening today."
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Orders — 2 columns */}
        <div className="lg:col-span-2 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-brand-500" />
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Recent Orders</h2>
            </div>
            <button className="flex items-center gap-1 text-xs font-medium text-brand-500 transition-colors hover:text-brand-400">
              View all
              <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {recentOrders.map((order) => (
              <div
                key={order.code}
                className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-[var(--accent)]/50"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{order.customer}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {order.code} · {order.table}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {order.items} items
                  </span>
                  <StatusBadge status={order.status} />
                  <span className="w-20 text-right text-sm font-medium text-[var(--foreground)]">
                    {order.total}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                    <Clock className="h-3 w-3" />
                    {order.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Best Seller */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-4">
              <Coffee className="h-4 w-4 text-brand-500" />
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Best Sellers</h2>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {bestSellers.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500/10 text-[10px] font-bold text-brand-500">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">{item.name}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{item.sold} sold</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    {item.revenue}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Low Stock Alert */}
          <div className="rounded-xl border border-danger-500/20 bg-[var(--card)]">
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-4">
              <AlertTriangle className="h-4 w-4 text-danger-500" />
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Low Stock Alert</h2>
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-danger-500/10 px-1.5 text-[10px] font-bold text-danger-500">
                {lowStockItems.length}
              </span>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {lowStockItems.map((item) => (
                <div key={item.name} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{item.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Min: {item.min} {item.unit}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold ${
                      item.severity === 'critical' ? 'text-danger-500' : 'text-warning-500'
                    }`}
                  >
                    {item.current} {item.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import { TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';

export const metadata: Metadata = { title: 'Analytics' };

const metrics = [
  { label: 'Avg Order Value', value: '142.58 EGP', change: '+5.2%', up: true },
  { label: 'Customer Return Rate', value: '68%', change: '+3.1%', up: true },
  { label: 'Table Turnover', value: '4.2x', change: '-0.3x', up: false },
  { label: 'Kitchen Efficiency', value: '94%', change: '+1.5%', up: true },
  { label: 'Peak Hour', value: '12:00-14:00', change: '', up: true },
  { label: 'Waste Rate', value: '2.3%', change: '-0.5%', up: true },
];

const hourlyData = [
  { hour: '08:00', orders: 5 },
  { hour: '09:00', orders: 12 },
  { hour: '10:00', orders: 8 },
  { hour: '11:00', orders: 18 },
  { hour: '12:00', orders: 32 },
  { hour: '13:00', orders: 28 },
  { hour: '14:00', orders: 22 },
  { hour: '15:00', orders: 10 },
  { hour: '16:00', orders: 14 },
  { hour: '17:00', orders: 20 },
  { hour: '18:00', orders: 35 },
  { hour: '19:00', orders: 38 },
  { hour: '20:00', orders: 30 },
  { hour: '21:00', orders: 18 },
  { hour: '22:00', orders: 8 },
];

const maxOrders = Math.max(...hourlyData.map((d) => d.orders));

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Real-time business intelligence and performance tracking."
        icon={TrendingUp}
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
              {metric.label}
            </p>
            <p className="mt-1 text-lg font-bold text-[var(--foreground)]">{metric.value}</p>
            {metric.change && (
              <div className="mt-1 flex items-center gap-0.5">
                {metric.up ? (
                  <ArrowUpRight className="h-3 w-3 text-success-500" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-danger-500" />
                )}
                <span
                  className={`text-[10px] font-medium ${
                    metric.up ? 'text-success-500' : 'text-danger-500'
                  }`}
                >
                  {metric.change}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Hourly Chart */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">Orders by Hour</h3>
        <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">Today&apos;s order distribution</p>
        <div className="mt-6 flex items-end gap-1.5" style={{ height: '200px' }}>
          {hourlyData.map((d) => (
            <div key={d.hour} className="group flex flex-1 flex-col items-center gap-1">
              <span className="text-[9px] font-medium text-[var(--muted-foreground)] opacity-0 transition-opacity group-hover:opacity-100">
                {d.orders}
              </span>
              <div
                className="w-full rounded-t-sm bg-brand-500/30 transition-colors hover:bg-brand-500"
                style={{ height: `${(d.orders / maxOrders) * 180}px` }}
              />
              <span className="text-[8px] text-[var(--muted-foreground)]">
                {d.hour.split(':')[0]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

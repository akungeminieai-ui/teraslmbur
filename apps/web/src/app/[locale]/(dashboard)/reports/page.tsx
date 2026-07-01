import type { Metadata } from 'next';
import { FileBarChart, Download, Calendar } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';

export const metadata: Metadata = { title: 'Reports' };

const reportCards = [
  { title: 'Daily Sales', description: 'Revenue breakdown by hour, product, and payment method.', value: '18,250 EGP', label: 'Today' },
  { title: 'Weekly Summary', description: 'Week-over-week comparison of sales, orders, and profit.', value: '112,400 EGP', label: 'This Week' },
  { title: 'Monthly Revenue', description: 'Full month breakdown with expense tracking.', value: '485,200 EGP', label: 'This Month' },
  { title: 'Gross Profit', description: 'Revenue minus HPP (Cost of Goods Sold).', value: '312,880 EGP', label: 'This Month' },
];

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Financial reports, sales analysis, and performance metrics."
        icon={FileBarChart}
        actions={
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--accent)]">
              <Calendar className="h-4 w-4" />
              Date Range
            </button>
            <button className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600">
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {reportCards.map((report) => (
          <div
            key={report.title}
            className="group rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 transition-all hover:border-[var(--muted-foreground)]/30 hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">{report.title}</h3>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">{report.description}</p>
              </div>
              <span className="rounded-full bg-[var(--muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)]">
                {report.label}
              </span>
            </div>
            <p className="mt-4 text-2xl font-bold text-[var(--foreground)]">{report.value}</p>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400 transition-all"
                style={{
                  width:
                    report.title === 'Daily Sales'
                      ? '75%'
                      : report.title === 'Weekly Summary'
                        ? '65%'
                        : report.title === 'Monthly Revenue'
                          ? '85%'
                          : '70%',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

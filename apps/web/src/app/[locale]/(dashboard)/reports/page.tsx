/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import * as React from 'react';
import { FileBarChart, Download, Calendar, TrendingUp, ArrowDown, Info, AlertTriangle, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { AppButton } from '@teras-lmbur/ui';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

type Period = 'today' | 'thisWeek' | 'thisMonth';

interface FinancialData {
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  margin: number;
  foodCostPercent: number;
  expensePercent: number;
}

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const focus = searchParams.get('focus');
  const breakdownRef = React.useRef<HTMLDivElement>(null);
  
  const [period, setPeriod] = React.useState<Period>('today');
  const [highlight, setHighlight] = React.useState(false);

  // Fetch real-time financial report metrics
  const { data: reportsData, isLoading, error, refetch } = useQuery<Record<Period, FinancialData>>({
    queryKey: ['analytics-reports'],
    queryFn: () => apiClient.get('/analytics/reports'),
    refetchInterval: 5000, // Realtime sync every 5s
  });

  // Handle focusing on profit breakdown from dashboard
  React.useEffect(() => {
    if (focus === 'profit') {
      setPeriod('today');
      setHighlight(true);
      
      const timer = setTimeout(() => {
        if (breakdownRef.current) {
          breakdownRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);

      // Turn off highlight after 4 seconds
      const highlightTimer = setTimeout(() => {
        setHighlight(false);
      }, 4000);

      return () => {
        clearTimeout(timer);
        clearTimeout(highlightTimer);
      };
    }
  }, [focus]);

  const currentData: FinancialData = reportsData?.[period] || {
    revenue: 0,
    cogs: 0,
    grossProfit: 0,
    expenses: 0,
    netProfit: 0,
    margin: 0,
    foodCostPercent: 0,
    expensePercent: 0,
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Laporan detail keuangan, pembagian pendapatan, dan analisis laba rugi."
        icon={FileBarChart}
        actions={
          <div className="flex items-center gap-2">
            <AppButton variant="outline" leftIcon={<Calendar className="h-4 w-4" />}>
              Date Range
            </AppButton>
            <AppButton leftIcon={<Download className="h-4 w-4" />}>
              Export
            </AppButton>
          </div>
        }
      />

      {error ? (
        <div className="rounded-xl border border-danger-500/20 bg-danger-500/5 p-8 flex flex-col items-center justify-center text-center gap-4">
          <AlertTriangle className="h-12 w-12 text-danger-500" />
          <div>
            <h3 className="text-base font-bold text-[var(--foreground)]">Gagal Memuat Laporan Keuangan</h3>
            <p className="text-xs text-[var(--muted-foreground)] mt-1 max-w-md">
              {(error as any)?.message || 'Gagal terhubung dengan server backend laporan real-time.'}
            </p>
          </div>
          <AppButton size="sm" onClick={() => refetch()} leftIcon={<RefreshCw className="h-4 w-4" />}>
            Coba Lagi
          </AppButton>
        </div>
      ) : isLoading ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 animate-pulse space-y-6">
          <div className="h-6 w-64 bg-[var(--accent)] rounded" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 h-64 bg-[var(--accent)] rounded-xl" />
            <div className="lg:col-span-8 space-y-4">
              <div className="h-12 bg-[var(--accent)] rounded-lg" />
              <div className="h-12 bg-[var(--accent)] rounded-lg" />
              <div className="h-12 bg-[var(--accent)] rounded-lg" />
            </div>
          </div>
        </div>
      ) : (
        /* Main Breakdown Section */
        <div 
          ref={breakdownRef}
          className={cn(
            "rounded-xl border bg-[var(--card)] p-6 transition-all duration-500",
            highlight 
              ? "border-brand-500 shadow-[0_0_15px_rgba(var(--brand-rgb),0.2)] ring-1 ring-brand-500" 
              : "border-[var(--border)]"
          )}
        >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border)] pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Rincian Pendapatan & Laba</h2>
              {highlight && (
                <span className="rounded bg-brand-500/10 px-2 py-0.5 text-[10px] font-semibold text-brand-500 animate-pulse">
                  Fokus Laba Hari Ini
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              Analisis pembagian pendapatan kotor, HPP, biaya operasional, dan perolehan laba bersih.
            </p>
          </div>

          {/* Period Selector Tabs */}
          <div className="flex border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--background)] p-0.5 h-10 self-start sm:self-auto shrink-0">
            {(['today', 'thisWeek', 'thisMonth'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-3 rounded-md text-xs font-semibold transition-all cursor-pointer capitalize',
                  period === p
                    ? 'bg-brand-500 text-white shadow-sm'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                )}
              >
                {p === 'today' ? 'Hari Ini' : p === 'thisWeek' ? 'Minggu Ini' : 'Bulan Ini'}
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard Calculation Widget */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
          
          {/* Summary Column - Left */}
          <div className="lg:col-span-4 flex flex-col justify-between gap-6 p-6 rounded-xl bg-[var(--accent)]/15 border border-[var(--border)]">
            <div className="space-y-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-500/10 text-success-500">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Laba Bersih ({period === 'today' ? 'Hari Ini' : period === 'thisWeek' ? 'Minggu Ini' : 'Bulan Ini'})
                </p>
                <p className="text-3xl font-extrabold text-success-500 tracking-tight mt-1">
                  {formatCurrency(currentData.netProfit)}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border)]/60 space-y-2">
              <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                <span>Profit Margin</span>
                <span className="font-semibold text-[var(--foreground)]">{currentData.margin}%</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                <span>Rasio HPP (Food Cost)</span>
                <span className="font-semibold text-[var(--foreground)]">{currentData.foodCostPercent}%</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                <span>Rasio Biaya Operasional</span>
                <span className="font-semibold text-[var(--foreground)]">{currentData.expensePercent}%</span>
              </div>
            </div>
          </div>

          {/* Funnel Breakdown Column - Right */}
          <div className="lg:col-span-8 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-1.5 mb-3">
              <Info className="h-3.5 w-3.5" />
              Alur Perhitungan Pendapatan ke Laba Bersih
            </h3>

            {/* Step 1: Gross Revenue */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--card)] border border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-500/10 text-brand-500 font-bold text-xs">
                  +
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[var(--foreground)]">Pendapatan Kotor (Gross Revenue)</h4>
                  <p className="text-[11px] text-[var(--muted-foreground)]">Total penjualan menu terbayar sebelum dikurangi biaya.</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-[var(--foreground)]">
                {formatCurrency(currentData.revenue)}
              </span>
            </div>

            <div className="flex justify-center -my-2 text-[var(--muted-foreground)]">
              <ArrowDown className="h-4 w-4" />
            </div>

            {/* Step 2: COGS / HPP */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--card)] border border-danger-500/10">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-danger-500/10 text-danger-500 font-bold text-xs">
                  -
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[var(--foreground)]">HPP / COGS (Cost of Goods Sold)</h4>
                  <p className="text-[11px] text-[var(--muted-foreground)]">Biaya bahan baku dan bahan pendukung yang terjual.</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-danger-500">
                {formatCurrency(currentData.cogs)}
              </span>
            </div>

            <div className="flex justify-center -my-2 text-[var(--muted-foreground)]">
              <ArrowDown className="h-4 w-4" />
            </div>

            {/* Step 3: Gross Profit */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--card)] border border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-500/5 text-brand-500 font-bold text-xs">
                  =
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[var(--foreground)]">Laba Kotor (Gross Profit)</h4>
                  <p className="text-[11px] text-[var(--muted-foreground)]">Pendapatan kotor dikurangi total biaya bahan baku.</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-[var(--foreground)]">
                {formatCurrency(currentData.grossProfit)}
              </span>
            </div>

            <div className="flex justify-center -my-2 text-[var(--muted-foreground)]">
              <ArrowDown className="h-4 w-4" />
            </div>

            {/* Step 4: Expenses */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--card)] border border-warning-500/10">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-warning-500/10 text-warning-500 font-bold text-xs">
                  -
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[var(--foreground)]">Biaya Operasional (Expenses)</h4>
                  <p className="text-[11px] text-[var(--muted-foreground)]">Biaya utilitas, listrik, air, dan penanganan outlet harian.</p>
                </div>
              </div>
              <span className="text-sm font-semibold text-warning-500">
                {formatCurrency(currentData.expenses)}
              </span>
            </div>

            <div className="flex justify-center -my-2 text-[var(--muted-foreground)]">
              <ArrowDown className="h-4 w-4" />
            </div>

            {/* Step 5: Net Profit */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-success-500/5 border border-success-500/20">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-success-500/10 text-success-500 font-bold text-xs">
                  =
                </div>
                <div>
                  <h4 className="text-sm font-bold text-success-500">Laba Bersih (Net Profit)</h4>
                  <p className="text-[11px] text-[var(--muted-foreground)]">Pendapatan bersih akhir yang siap dicairkan atau diinvestasikan.</p>
                </div>
              </div>
              <span className="text-sm font-bold text-success-500">
                {formatCurrency(currentData.netProfit)}
              </span>
            </div>

            {/* Visual Breakdown Bar */}
            <div className="mt-6 pt-4 border-t border-[var(--border)]/40">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">Visualisasi Penggunaan Pendapatan</p>
              <div className="h-4 w-full flex rounded-full overflow-hidden text-[9px] font-bold text-white text-center">
                <div 
                  style={{ width: `${currentData.foodCostPercent}%` }} 
                  className="bg-danger-500 flex items-center justify-center"
                  title={`HPP / Bahan Baku: ${currentData.foodCostPercent}%`}
                >
                  {currentData.foodCostPercent > 15 && `HPP (${currentData.foodCostPercent.toFixed(0)}%)`}
                </div>
                <div 
                  style={{ width: `${currentData.expensePercent}%` }} 
                  className="bg-warning-500 flex items-center justify-center"
                  title={`Operasional: ${currentData.expensePercent}%`}
                >
                  {currentData.expensePercent > 10 && `Operasional (${currentData.expensePercent.toFixed(0)}%)`}
                </div>
                <div 
                  style={{ width: `${currentData.margin}%` }} 
                  className="bg-success-500 flex items-center justify-center"
                  title={`Laba Bersih: ${currentData.margin}%`}
                >
                  {currentData.margin > 15 && `Laba Bersih (${currentData.margin.toFixed(0)}%)`}
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
      )}
    </div>
  );
}

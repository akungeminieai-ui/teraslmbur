'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/shared/page-header';
import { AppButton } from '@teras-lmbur/ui';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  RefreshCw,
  Clock,
  UtensilsCrossed,
  ShoppingBag,
  Truck,
  PieChart,
  Layers,
} from 'lucide-react';

interface MetricItem {
  label: string;
  value: string;
  change?: string;
  up?: boolean;
}

interface HourlyItem {
  hour: string;
  orders: number;
}

interface ChannelItem {
  type: string;
  label: string;
  count: number;
  revenue: string;
  percentage: number;
}

interface CategoryItem {
  name: string;
  count: number;
  revenue: string;
  percentage: number;
}

interface AnalyticsOverviewData {
  metrics: MetricItem[];
  hourlyData: HourlyItem[];
  channelBreakdown: ChannelItem[];
  topCategories: CategoryItem[];
  summary: {
    totalOrders: number;
    totalRevenue: string;
    peakHour: string;
  };
}

export default function AnalyticsPage() {
  const locale = useLocale();
  const t = useTranslations('analytics');

  const { data, isLoading, error, refetch, isFetching } = useQuery<AnalyticsOverviewData>({
    queryKey: ['analytics-overview', locale],
    queryFn: () => apiClient.get(`/analytics/overview?locale=${locale}`),
    refetchInterval: 5000,
  });

  const metrics = data?.metrics || [];
  const hourlyData = data?.hourlyData || [];
  const channelBreakdown = data?.channelBreakdown || [];
  const topCategories = data?.topCategories || [];
  const summary = data?.summary;
  const maxOrders = Math.max(...hourlyData.map((d) => d.orders), 1);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-[var(--card)] border border-[var(--border)] rounded-lg" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl border border-[var(--border)] bg-[var(--card)]" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8 h-80 rounded-xl border border-[var(--border)] bg-[var(--card)]" />
          <div className="lg:col-span-4 h-80 rounded-xl border border-[var(--border)] bg-[var(--card)]" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('title') || 'Analytics & BI'}
          description={t('description') || 'Real-time business intelligence and operational performance tracking.'}
          icon={TrendingUp}
        />
        <div className="rounded-xl border border-danger-500/20 bg-danger-500/5 p-8 flex flex-col items-center justify-center text-center gap-4">
          <AlertTriangle className="h-12 w-12 text-danger-500" />
          <div>
            <h3 className="text-base font-bold text-[var(--foreground)]">{t('errorTitle') || 'Gagal Memuat Analytics Real-time'}</h3>
            <p className="text-xs text-[var(--muted-foreground)] mt-1 max-w-md">
              {(error as any)?.message || t('errorDesc') || 'Gagal terhubung dengan server backend analytics.'}
            </p>
          </div>
          <AppButton size="sm" onClick={() => refetch()} leftIcon={<RefreshCw className="h-4 w-4" />}>
            {t('retry') || 'Coba Lagi Connection'}
          </AppButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title') || 'Analytics & BI'}
        description={t('description') || 'Real-time business intelligence and operational performance tracking.'}
        icon={TrendingUp}
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-success-500/20 bg-success-500/10 px-3 py-1 text-xs font-semibold text-success-500">
              <span className="h-2 w-2 rounded-full bg-success-500 animate-pulse" />
              {t('liveSync') || 'LIVE SYNC'}
            </div>
            <AppButton
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              leftIcon={<RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />}
            >
              {t('refresh') || 'Refresh'}
            </AppButton>
          </div>
        }
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm hover:border-brand-500/40 transition-colors">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
              {metric.label}
            </p>
            <p className="mt-1.5 text-lg font-extrabold text-[var(--foreground)]">{metric.value}</p>
            {metric.change && (
              <div className="mt-1 flex items-center gap-0.5">
                {metric.up ? (
                  <ArrowUpRight className="h-3 w-3 text-success-500" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-danger-500" />
                )}
                <span
                  className={`text-[10px] font-semibold ${
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

      {/* Analytics Main Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Hourly Chart & Peak Hour Breakdown */}
        <div className="lg:col-span-8 space-y-6">
          {/* Hourly Chart */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-[var(--foreground)]">{t('hourlyDistribution') || 'Distribusi Pesanan Jam Operasional'}</h3>
                <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{t('hourlySubtitle') || 'Tren volume pesanan hari ini dari 08:00 - 22:00'}</p>
              </div>
              {summary && (
                <div className="text-right">
                  <p className="text-xs text-[var(--muted-foreground)]">{t('peakHourToday') || 'Peak Jam Hari Ini'}</p>
                  <p className="text-sm font-bold text-brand-500 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {summary.peakHour}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8 flex items-end gap-2" style={{ height: '220px' }}>
              {hourlyData.map((d) => (
                <div key={d.hour} className="group flex flex-1 flex-col items-center gap-1.5 h-full justify-end">
                  <span className="text-[10px] font-bold text-brand-500 opacity-0 transition-opacity group-hover:opacity-100 font-mono">
                    {d.orders}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-brand-500/25 transition-all duration-300 group-hover:bg-brand-500 shadow-sm"
                    style={{ height: `${(d.orders / maxOrders) * 170}px`, minHeight: '4px' }}
                  />
                  <span className="text-[9px] font-semibold text-[var(--muted-foreground)]">
                    {d.hour.split(':')[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Operational Highlight Banner */}
          <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 p-5 flex items-start gap-4">
            <div className="p-2.5 rounded-lg bg-brand-500/10 text-brand-500 shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[var(--foreground)]">{t('recommendationTitle') || 'Rekomendasi Kapasitas Dapur'}</h4>
              <p className="text-xs text-[var(--muted-foreground)] mt-1 leading-relaxed">
                {t('recommendationDesc', { peakHour: summary?.peakHour || '12:00-13:00' }) || `Jam sibuk puncak terdeteksi pada pukul ${summary?.peakHour || '12:00-13:00'}. Pastikan stok bahan baku utama dan staf dapur berada dalam kesiapan penuh sebelum waktu puncak untuk menjaga efisiensi pesanan di atas 90%.`}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Channels Breakdown & Top Categories */}
        <div className="lg:col-span-4 space-y-6">
          {/* Sales Channels Breakdown */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4 border-b border-[var(--border)] pb-3">
              <PieChart className="h-4 w-4 text-brand-500" />
              <h3 className="text-sm font-bold text-[var(--foreground)]">{t('salesChannelBreakdown') || 'Pembagian Saluran Penjualan'}</h3>
            </div>

            {channelBreakdown.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)] py-4 text-center">{t('noTransactionsToday') || 'Belum ada transaksi hari ini.'}</p>
            ) : (
              <div className="space-y-4">
                {channelBreakdown.map((ch) => {
                  const IconComponent =
                    ch.type === 'DINE_IN'
                      ? UtensilsCrossed
                      : ch.type === 'TAKE_AWAY'
                      ? ShoppingBag
                      : Truck;

                  return (
                    <div key={ch.type} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                          <span className="font-semibold text-[var(--foreground)]">{ch.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[var(--foreground)]">{ch.count} {t('ordersCount', { count: '' }).trim() || 'order'}</span>
                          <span className="text-[10px] text-[var(--muted-foreground)] font-mono">({ch.percentage}%)</span>
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[var(--accent)] overflow-hidden">
                        <div
                          className="h-full bg-brand-500 rounded-full transition-all duration-500"
                          style={{ width: `${ch.percentage}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-[var(--muted-foreground)] text-right font-mono">
                        {ch.revenue}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top Categories */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4 border-b border-[var(--border)] pb-3">
              <Layers className="h-4 w-4 text-brand-500" />
              <h3 className="text-sm font-bold text-[var(--foreground)]">{t('topCategoryPerformance') || 'Performa Kategori Teratas'}</h3>
            </div>

            {topCategories.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)] py-4 text-center">{t('noCategorySalesToday') || 'Belum ada penjualan kategori hari ini.'}</p>
            ) : (
              <div className="space-y-3.5">
                {topCategories.map((cat, idx) => (
                  <div key={cat.name} className="flex items-center justify-between border-b border-[var(--border)]/40 pb-2.5 last:border-b-0 last:pb-0">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500/10 text-[10px] font-extrabold text-brand-500">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-[var(--foreground)]">{cat.name}</p>
                        <p className="text-[10px] text-[var(--muted-foreground)]">{cat.count} {t('itemsSold', { count: '' }).trim() || 'item terjual'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-[var(--foreground)] font-mono">{cat.revenue}</p>
                      <p className="text-[10px] text-success-500 font-semibold">{cat.percentage}% total</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

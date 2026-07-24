/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocale } from 'next-intl';
import { apiClient } from '@/lib/api-client';
import { useRouter } from '@/i18n/routing';
import { useAuth } from '@/providers/auth-provider';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { StatusBadge } from '@/components/shared/status-badge';
import { AppButton } from '@teras-lmbur/ui';
import { useAppToast } from '@/hooks/use-app-toast';
import { cn } from '@/lib/utils';
import {
  DollarSign,
  ShoppingCart,
  ChefHat,
  Armchair,
  CreditCard,
  QrCode,
  Flame,
  ArrowUpRight,
  Clock,
  LayoutDashboard,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export default function DashboardPage() {
  const locale = useLocale();
  const router = useRouter();
  const { user } = useAuth();
  const toast = useAppToast();

  // Fetch real-time dashboard data
  const { data: dashboardData, isLoading, refetch } = useQuery<any>({
    queryKey: ['dashboard-stats-os', locale],
    queryFn: () => apiClient.get(`/analytics/dashboard?locale=${locale}`),
  });

  // Fetch tables list for occupied stat
  const { data: tablesData = [] } = useQuery<any[]>({
    queryKey: ['tables-dashboard'],
    queryFn: () => apiClient.get('/tables'),
  });

  const occupiedTables = React.useMemo(() => {
    return tablesData.filter((t: any) => t.status === 'OCCUPIED' || t.status === 'RESERVED').length;
  }, [tablesData]);

  // Compute pending self-orders count
  const pendingOrders = React.useMemo(() => {
    if (!dashboardData?.recentOrders) return [];
    return dashboardData.recentOrders.filter((o: any) => o.status === 'PENDING');
  }, [dashboardData]);

  const stats = React.useMemo(() => {
    return [
      {
        label: 'Penjualan Hari Ini',
        value: dashboardData?.revenue || '0.00 EGP',
        icon: DollarSign,
        onClick: () => router.push('/orders'),
      },
      {
        label: 'Total Pesanan Hari Ini',
        value: dashboardData?.orders || '0',
        icon: ShoppingCart,
        onClick: () => router.push('/orders'),
      },
      {
        label: 'Antrean Dapur (Kitchen)',
        value: dashboardData?.kitchenQueue || '0',
        icon: ChefHat,
        onClick: () => router.push('/kitchen'),
      },
      {
        label: 'Meja Terisi (Occupied)',
        value: `${occupiedTables} / ${tablesData.length || 0}`,
        icon: Armchair,
        onClick: () => router.push('/tables'),
      },
    ];
  }, [dashboardData, occupiedTables, tablesData.length, router]);

  const recentOrders = dashboardData?.recentOrders || [];

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <PageHeader
        title="Teras Lmbur OS Workspace"
        description={`Selamat datang kembali, ${user?.name || 'Kasir / Admin'}. Pusat operasional POS, Pesanan, Dapur & QR Menu.`}
        icon={LayoutDashboard}
      />

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => router.push('/pos')}
          className="flex flex-col items-center justify-center p-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] hover:border-brand-500/40 hover:bg-[var(--accent)]/30 transition-all cursor-pointer group text-center space-y-2 shadow-xs active:scale-95"
        >
          <div className="h-11 w-11 rounded-xl bg-brand-500/10 text-brand-500 border border-brand-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-[var(--foreground)]">POS Workspace</h3>
            <p className="text-[10px] text-[var(--muted-foreground)]">Kasir & Transaksi</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => router.push('/orders')}
          className="flex flex-col items-center justify-center p-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] hover:border-brand-500/40 hover:bg-[var(--accent)]/30 transition-all cursor-pointer group text-center space-y-2 shadow-xs active:scale-95"
        >
          <div className="h-11 w-11 rounded-xl bg-brand-500/10 text-brand-500 border border-brand-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <ShoppingCart className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-[var(--foreground)]">Pesanan (Orders)</h3>
            <p className="text-[10px] text-[var(--muted-foreground)]">Daftar Transaksi</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => router.push('/kitchen')}
          className="flex flex-col items-center justify-center p-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] hover:border-brand-500/40 hover:bg-[var(--accent)]/30 transition-all cursor-pointer group text-center space-y-2 shadow-xs active:scale-95"
        >
          <div className="h-11 w-11 rounded-xl bg-brand-500/10 text-brand-500 border border-brand-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <ChefHat className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-[var(--foreground)]">Dapur (Kitchen)</h3>
            <p className="text-[10px] text-[var(--muted-foreground)]">Layar KDS Dapur</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => router.push('/tables')}
          className="flex flex-col items-center justify-center p-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] hover:border-brand-500/40 hover:bg-[var(--accent)]/30 transition-all cursor-pointer group text-center space-y-2 shadow-xs active:scale-95"
        >
          <div className="h-11 w-11 rounded-xl bg-brand-500/10 text-brand-500 border border-brand-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Armchair className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-[var(--foreground)]">Manajemen Meja</h3>
            <p className="text-[10px] text-[var(--muted-foreground)]">Denah & Status Meja</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => router.push('/settings/qr-menu')}
          className="flex flex-col items-center justify-center p-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] hover:border-brand-500/40 hover:bg-[var(--accent)]/30 transition-all cursor-pointer group text-center space-y-2 shadow-xs active:scale-95 col-span-2 sm:col-span-1"
        >
          <div className="h-11 w-11 rounded-xl bg-brand-500/10 text-brand-500 border border-brand-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <QrCode className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-black text-[var(--foreground)]">QR Menu</h3>
            <p className="text-[10px] text-[var(--muted-foreground)]">Cetak QR & Medsos</p>
          </div>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            onClick={stat.onClick}
            className="transition-transform duration-150 active:scale-95 cursor-pointer"
          >
            <StatCard {...stat} />
          </div>
        ))}
      </div>

      {/* Live Orders & Quick Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Orders — 2 Columns */}
        <div className="lg:col-span-2 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-xs">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-brand-500" />
              <h2 className="text-sm font-bold text-[var(--foreground)]">Pesanan Terbaru Real-Time</h2>
            </div>
            <AppButton
              variant="link"
              size="sm"
              className="h-auto p-0 font-bold text-brand-500 hover:text-brand-400 cursor-pointer"
              onClick={() => router.push('/orders')}
              rightIcon={<ArrowUpRight className="h-3 w-3" />}
            >
              Lihat Semua Pesanan
            </AppButton>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-xs text-[var(--muted-foreground)]">
              Memuat pesanan...
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="p-12 text-center text-xs text-[var(--muted-foreground)]">
              Belum ada transaksi hari ini.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {recentOrders.map((order: any) => (
                <div
                  key={order.code}
                  className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-4 transition-colors hover:bg-[var(--accent)]/50 cursor-pointer"
                  onClick={() => router.push('/orders')}
                >
                  <div>
                    <p className="text-sm font-bold text-[var(--foreground)]">{order.customer}</p>
                    <p className="text-xs text-[var(--muted-foreground)] font-mono">
                      {order.code} · {order.table || 'Takeaway'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 sm:gap-4 border-t border-[var(--border)]/40 pt-3 sm:border-t-0 sm:pt-0">
                    <span className="text-xs text-[var(--muted-foreground)] font-mono">
                      {order.items} item
                    </span>
                    <StatusBadge status={order.status} />
                    <span className="text-sm font-bold text-[var(--foreground)] sm:w-24 sm:text-right font-mono">
                      {order.total}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] font-mono">
                      <Clock className="h-3 w-3" />
                      {order.time}
                    </span>
                    {order.status === 'PENDING' && (
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const orderIdToConfirm = order.id || (recentOrders.find((r: any) => r.code === order.code)?.id);
                            await apiClient.patch(`/public/orders/${orderIdToConfirm}/confirm`);
                            toast.rawSuccess(`Pesanan ${order.code} berhasil dikonfirmasi ke dapur!`);
                            refetch();
                          } catch (err: any) {
                            toast.rawError(err?.message || 'Gagal konfirmasi pesanan');
                          }
                        }}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer shrink-0"
                        title="Konfirmasi & Kirim Tiket Ke Dapur"
                      >
                        <Flame className="h-3.5 w-3.5" />
                        <span>Konfirmasi ke Dapur</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Panel — Quick Status Summary */}
        <div className="space-y-6">
          {/* Workspace Quick Links Card */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-4">
            <h3 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> System Operational Check
            </h3>
            
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                <span className="text-[var(--muted-foreground)]">Status System:</span>
                <span className="font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  ONLINE (Teras Lmbur OS)
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                <span className="text-[var(--muted-foreground)] font-medium">Modul Terpasang:</span>
                <span className="font-bold text-[var(--foreground)]">5 Core Pages</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                <span className="text-[var(--muted-foreground)] font-medium">Auto-Sync Dapur:</span>
                <span className="font-bold text-brand-500">Aktif (5s Polling)</span>
              </div>
            </div>

            <AppButton
              variant="outline"
              size="sm"
              onClick={() => router.push('/settings/qr-menu')}
              className="w-full justify-center text-xs font-bold border-brand-500/30 text-brand-500 hover:bg-brand-500/10 cursor-pointer"
            >
              📱 Buka Generator QR Menu Meja
            </AppButton>
          </div>

          {/* Pending Self-Orders Notification Card */}
          {pendingOrders.length > 0 && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-3 shadow-sm animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-md">
                  {pendingOrders.length}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5">
                    <Flame className="h-3.5 w-3.5 text-amber-500" /> Pesanan Self-Order (PENDING)!
                  </h4>
                  <p className="text-[10px] text-[var(--muted-foreground)]">
                    Ada {pendingOrders.length} pesanan baru belum masuk dapur.
                  </p>
                </div>
              </div>
              <AppButton
                size="sm"
                onClick={async () => {
                  try {
                    await Promise.all(pendingOrders.map((o: any) => apiClient.patch(`/public/orders/${o.id}/confirm`)));
                    toast.rawSuccess('Semua pesanan PENDING berhasil dikonfirmasi ke dapur!');
                    refetch();
                  } catch {
                    toast.rawError('Gagal konfirmasi pesanan');
                  }
                }}
                className="w-full justify-center bg-amber-500 hover:bg-amber-600 text-white border-none cursor-pointer font-bold text-xs shadow-md shadow-amber-500/20"
              >
                🔥 Konfirmasi Semua ({pendingOrders.length}) Ke Dapur
              </AppButton>
            </div>
          )}

          {/* Stock Alert Notification Card */}
          {dashboardData?.lowStock && dashboardData.lowStock.length > 0 && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 space-y-3 shadow-sm animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-rose-500 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-md">
                  {dashboardData.lowStock.length}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-500" /> Stock Alert Bahan Baku!
                  </h4>
                  <p className="text-[10px] text-[var(--muted-foreground)]">
                    {dashboardData.lowStock.map((i: any) => `${i.name} (${i.current} ${i.unit})`).slice(0, 2).join(', ')}
                    {dashboardData.lowStock.length > 2 ? '...' : ''}
                  </p>
                </div>
              </div>
              <AppButton
                size="sm"
                onClick={() => router.push('/inventory')}
                className="w-full justify-center bg-rose-500 hover:bg-rose-600 text-white border-none cursor-pointer font-bold text-xs shadow-md shadow-rose-500/20"
              >
                📦 Kelola Inventaris & Stok
              </AppButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

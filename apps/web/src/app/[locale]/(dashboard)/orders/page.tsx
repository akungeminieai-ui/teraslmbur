'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations, useLocale } from 'next-intl';
import { ShoppingCart, Loader2, Search, Calendar, AlertTriangle, ArrowUpRight, Pencil, Trash2, Flame, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { OrderStatus } from '@teras-lmbur/types';
import { apiClient } from '@/lib/api-client';
import { useAppToast } from '@/hooks/use-app-toast';
import { cn } from '@/lib/utils';
import { AppButton } from '@teras-lmbur/ui';
import { useRouter } from '@/i18n/routing';

export default function OrdersPage() {
  const t = useTranslations('orders');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();

  // Filters State
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<string>('');
  const [dateFilter, setDateFilter] = React.useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('today');
  const [customStart, setCustomStart] = React.useState('');
  const [customEnd, setCustomEnd] = React.useState('');

  // Edit & Delete Dialog States
  const [editingOrder, setEditingOrder] = React.useState<any | null>(null);
  const [editCustomerName, setEditCustomerName] = React.useState('');
  const [editCustomerPhone, setEditCustomerPhone] = React.useState('');
  const [editTableId, setEditTableId] = React.useState('');
  const [editStatus, setEditStatus] = React.useState('');
  const [isUpdating, setIsUpdating] = React.useState(false);

  const [deletingOrder, setDeletingOrder] = React.useState<any | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Selection & Bulk States
  const [selectedOrderIds, setSelectedOrderIds] = React.useState<string[]>([]);
  const [bulkDeletingIds, setBulkDeletingIds] = React.useState<string[] | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = React.useState(false);

  // Fetch tables list for Dine-In selection
  const { data: tables = [] } = useQuery<any[]>({
    queryKey: ['tables'],
    queryFn: () => apiClient.get('/tables'),
  });

  // Date Range Calculations
  const dateParams = React.useMemo(() => {
    const startOfDay = (d: Date) => {
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    };
    const endOfDay = (d: Date) => {
      d.setHours(23, 59, 59, 999);
      return d.toISOString();
    };

    let startDate = '';
    let endDate = '';

    if (dateFilter === 'today') {
      startDate = startOfDay(new Date());
      endDate = endOfDay(new Date());
    } else if (dateFilter === 'yesterday') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      startDate = startOfDay(d);
      endDate = endOfDay(d);
    } else if (dateFilter === 'week') {
      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(d.setDate(diff));
      startDate = startOfDay(monday);
      endDate = endOfDay(new Date());
    } else if (dateFilter === 'month') {
      const d = new Date();
      const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
      startDate = startOfDay(firstDay);
      endDate = endOfDay(new Date());
    } else if (dateFilter === 'custom' && customStart && customEnd) {
      startDate = startOfDay(new Date(customStart));
      endDate = endOfDay(new Date(customEnd));
    }

    return { startDate, endDate };
  }, [dateFilter, customStart, customEnd]);

  // Fetch real order history
  const { data: ordersData, isLoading, error, refetch } = useQuery<any>({
    queryKey: ['orders-history-list', search, status, dateParams],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('pageSize', '100');
      if (status) params.set('status', status);
      if (search) params.set('search', search);
      if (dateParams.startDate && dateParams.endDate) {
        params.set('startDate', dateParams.startDate);
        params.set('endDate', dateParams.endDate);
      }
      return apiClient.get(`/orders?${params.toString()}`);
    },
    refetchInterval: 5000, // Sync order states every 5 seconds
  });

  // Group orders by localized date string
  const groupedOrders = React.useMemo(() => {
    if (!ordersData?.items) return [];

    const groups: { [key: string]: any[] } = {};
    ordersData.items.forEach((order: any) => {
      const date = new Date(order.createdAt);
      const dateKey = date.toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(order);
    });

    return Object.entries(groups).map(([date, items]) => ({
      date,
      items,
    }));
  }, [ordersData, locale]);

  React.useEffect(() => {
    setSelectedOrderIds([]);
  }, [search, status, dateParams]);

  const toast = useAppToast();

  // Pending self-orders list for alert banner
  const pendingSelfOrders = React.useMemo(() => {
    if (!ordersData?.items) return [];
    return ordersData.items.filter((o: any) => o.status === 'PENDING');
  }, [ordersData]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title') || 'Orders'}
        description={t('subtitle') || 'Track and manage all cafe transaction orders.'}
        icon={ShoppingCart}
      />

      {/* Alert Banner for PENDING Self-Orders */}
      {pendingSelfOrders.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-amber-500/10 border-2 border-amber-500/30 p-4 rounded-2xl shadow-lg animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-md">
              {pendingSelfOrders.length}
            </div>
            <div>
              <h4 className="text-sm font-bold text-[var(--foreground)] flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-amber-500" /> Ada {pendingSelfOrders.length} Pesanan Self-Order (PENDING) Baru!
              </h4>
              <p className="text-xs text-[var(--muted-foreground)]">
                Pesanan belum masuk ke dapur. Klik tombol di bawah untuk mengonfirmasi sekaligus mengirim tiket ke dapur.
              </p>
            </div>
          </div>
          <AppButton
            size="sm"
            onClick={async () => {
              try {
                await Promise.all(pendingSelfOrders.map((o: any) => apiClient.patch(`/public/orders/${o.id}/confirm`)));
                toast.rawSuccess('Semua pesanan PENDING berhasil dikonfirmasi ke dapur!');
                refetch();
              } catch {
                toast.rawError('Gagal mengonfirmasi pesanan');
              }
            }}
            className="bg-amber-500 hover:bg-amber-600 text-white border-none shrink-0 cursor-pointer font-bold shadow-md shadow-amber-500/20"
          >
            🔥 Konfirmasi Semua ({pendingSelfOrders.length}) & Kirim Ke Dapur
          </AppButton>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-xs">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Search box */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              type="text"
              placeholder={t('searchPlaceholder') || 'Search order code or customer...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-10 pr-3 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Status Dropdown */}
          <div className="w-full md:w-56">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
            >
              <option value="">{t('allStatuses') || 'All Statuses'}</option>
              <option value="PENDING">⚠️ PENDING (Self-Order Baru)</option>
              <option value="CONFIRMED">{t('status.confirmed') || 'Waiting'}</option>
              <option value={OrderStatus.PREPARING}>{t('status.preparing') || 'Preparing'}</option>
              <option value={OrderStatus.READY}>{t('status.ready') || 'Ready'}</option>
              <option value={OrderStatus.COMPLETED}>{t('status.completed') || 'Completed'}</option>
              <option value={OrderStatus.CANCELLED}>{t('status.cancelled') || 'Cancelled'}</option>
            </select>
          </div>

        </div>

        {/* Date Filters Segment */}
        <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)]/40 pt-4">
          <span className="text-xs font-semibold text-[var(--muted-foreground)] mr-2 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> Date:
          </span>
          {[
            { key: 'today', label: t('date.today') || 'Today' },
            { key: 'yesterday', label: t('date.yesterday') || 'Yesterday' },
            { key: 'week', label: t('date.week') || 'This Week' },
            { key: 'month', label: t('date.month') || 'This Month' },
            { key: 'custom', label: t('date.custom') || 'Custom Range' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setDateFilter(item.key as any)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer",
                dateFilter === item.key
                  ? "bg-brand-500 text-white border-brand-500 shadow-sm"
                  : "bg-[var(--card)] text-[var(--muted-foreground)] border-[var(--border)] hover:bg-[var(--accent)]"
              )}
            >
              {item.label}
            </button>
          ))}

          {/* Custom Date Inputs */}
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 ml-auto animate-scale-in">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs text-[var(--foreground)]"
              />
              <span className="text-xs text-[var(--muted-foreground)]">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-8 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2 text-xs text-[var(--foreground)]"
              />
            </div>
          )}
        </div>
      </div>

      {/* Bulk Actions Banner */}
      {selectedOrderIds.length > 0 && (
        <div className="flex items-center justify-between bg-rose-500/10 border border-rose-500/20 px-5 py-3 rounded-xl animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-xs font-bold text-rose-500">
              {selectedOrderIds.length} terpilih
            </span>
          </div>
          <div className="flex gap-2">
            <AppButton
              size="sm"
              variant="outline"
              onClick={() => setSelectedOrderIds([])}
              className="text-xs border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--accent)]"
            >
              Batal
            </AppButton>
            <AppButton
              size="sm"
              onClick={() => setBulkDeletingIds(selectedOrderIds)}
              className="cursor-pointer text-xs bg-rose-500 hover:bg-rose-600 text-white border-none"
            >
              Hapus Terpilih
            </AppButton>
          </div>
        </div>
      )}

      {/* Live History List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-24 border border-[var(--border)] bg-[var(--card)] rounded-xl animate-pulse gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          <span className="text-xs text-[var(--muted-foreground)]">Loading real-time order history...</span>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-danger-500/20 bg-danger-500/5 p-8 flex flex-col items-center justify-center text-center gap-4">
          <AlertTriangle className="h-10 w-10 text-danger-500" />
          <div>
            <h3 className="text-sm font-bold text-[var(--foreground)]">Failed to retrieve order logs</h3>
            <p className="text-xs text-[var(--muted-foreground)] mt-1 max-w-sm">
              {(error as any).message || 'Connection lost to the central transactions database.'}
            </p>
          </div>
          <AppButton size="sm" onClick={() => refetch()} className="cursor-pointer">
            Retry Connection
          </AppButton>
        </div>
      ) : groupedOrders.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title={t('emptyStateTitle') || 'No Orders Logged'}
          description={t('emptyStateDesc') || 'No orders matched your selected filters or date ranges.'}
          action={
            <AppButton size="sm" onClick={() => router.push('/pos')} className="cursor-pointer" rightIcon={<ArrowUpRight className="h-3.5 w-3.5" />}>
              {t('newOrder') || 'Create New Order'}
            </AppButton>
          }
        />
      ) : (
        <div className="space-y-8">
          {groupedOrders.map((group) => (
            <div key={group.date} className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                {group.date}
              </h3>
              
              <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-left bg-[var(--accent)]/5">
                        <th className="px-5 py-3 w-12 text-center">
                          <input
                            type="checkbox"
                            checked={group.items.length > 0 && group.items.every(item => selectedOrderIds.includes(item.id))}
                            onChange={(e) => {
                              const itemIds = group.items.map(item => item.id);
                              if (e.target.checked) {
                                setSelectedOrderIds(prev => Array.from(new Set([...prev, ...itemIds])));
                              } else {
                                setSelectedOrderIds(prev => prev.filter(id => !itemIds.includes(id)));
                              }
                            }}
                            className="h-4 w-4 rounded border-[var(--border)] text-brand-500 focus:ring-brand-500 cursor-pointer"
                          />
                        </th>
                        <th className="px-5 py-3 font-medium text-[var(--muted-foreground)] w-24">Order</th>
                        <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">Customer</th>
                        <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">Table/Session</th>
                        <th className="px-5 py-3 font-medium text-[var(--muted-foreground)]">Items Summary</th>
                        <th className="px-5 py-3 font-medium text-[var(--muted-foreground)] w-28">Status</th>
                        <th className="px-5 py-3 text-right font-medium text-[var(--muted-foreground)] w-36">Total Sales</th>
                        <th className="px-5 py-3 font-medium text-[var(--muted-foreground)] w-28">Time</th>
                        <th className="px-5 py-3 text-center font-medium text-[var(--muted-foreground)] w-28">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {group.items.map((order) => {
                        const dateObj = new Date(order.createdAt);
                        const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        
                        return (
                          <tr key={order.code} className="transition-colors hover:bg-[var(--accent)]/30">
                            <td className="px-5 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selectedOrderIds.includes(order.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedOrderIds(prev => [...prev, order.id]);
                                  } else {
                                    setSelectedOrderIds(prev => prev.filter(id => id !== order.id));
                                  }
                                }}
                                className="h-4 w-4 rounded border-[var(--border)] text-brand-500 focus:ring-brand-500 cursor-pointer"
                              />
                            </td>
                            <td className="px-5 py-3 font-mono text-xs text-brand-500 font-semibold">{order.code}</td>
                            <td className="px-5 py-3 font-medium text-[var(--foreground)]">{order.customerName}</td>
                            <td className="px-5 py-3 text-[var(--muted-foreground)] font-semibold">
                              {order.tableNumber ? `Table ${order.tableNumber}` : 'Take Away'}
                            </td>
                            <td className="px-5 py-3 text-[var(--muted-foreground)] text-xs truncate max-w-[200px]">
                              {order.items.map((i: any) => `${i.productName} (${i.quantity}x)`).join(', ')}
                            </td>
                            <td className="px-5 py-3">
                              <StatusBadge status={order.status} />
                            </td>
                            <td className="px-5 py-3 text-right font-bold font-mono text-[var(--foreground)]">
                              {order.total.toFixed(2)} EGP
                            </td>
                            <td className="px-5 py-3 text-[var(--muted-foreground)] font-mono text-xs">{formattedTime}</td>
                            <td className="px-5 py-3">
                              <div className="flex items-center justify-center gap-2">
                                {order.status === 'PENDING' && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        await apiClient.patch(`/public/orders/${order.id}/confirm`);
                                        toast.rawSuccess(`Order ${order.code} berhasil dikonfirmasi ke dapur!`);
                                        refetch();
                                      } catch {
                                        toast.rawError('Gagal konfirmasi order');
                                      }
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all cursor-pointer shrink-0"
                                    title="Konfirmasi & Kirim Tiket Ke Dapur"
                                  >
                                    <Flame className="h-3.5 w-3.5" />
                                    <span>Konfirmasi ke Dapur</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingOrder(order);
                                    setEditCustomerName(order.customerName);
                                    setEditCustomerPhone(order.customerPhone || '');
                                    setEditTableId(order.tableId || '');
                                    setEditStatus(order.status);
                                  }}
                                  className="p-1.5 rounded-lg border border-[var(--border)] hover:border-brand-500 hover:text-brand-500 text-[var(--muted-foreground)] bg-[var(--card)] transition-colors cursor-pointer"
                                  title="Edit Order"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingOrder(order)}
                                  className="p-1.5 rounded-lg border border-[var(--border)] hover:border-danger-500 hover:text-danger-500 text-[var(--muted-foreground)] bg-[var(--card)] transition-colors cursor-pointer"
                                  title="Delete Order"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs font-sans">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl animate-scale-in">
            <h2 className="text-lg font-bold text-[var(--foreground)]">
              Edit Order {editingOrder.code}
            </h2>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Modify customer details, table sessions, or order status.
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setIsUpdating(true);
                try {
                  await apiClient.patch(`/orders/${editingOrder.id}`, {
                    customerName: editCustomerName,
                    customerPhone: editCustomerPhone,
                    tableId: editTableId || null,
                    status: editStatus,
                  });
                  refetch();
                  setEditingOrder(null);
                } catch (err: any) {
                  console.error(err);
                } finally {
                  setIsUpdating(false);
                }
              }}
              className="mt-6 space-y-4 text-left"
            >
              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  required
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  Customer Phone (Optional)
                </label>
                <input
                  type="text"
                  value={editCustomerPhone}
                  onChange={(e) => setEditCustomerPhone(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  Dine-In Table
                </label>
                <select
                  value={editTableId}
                  onChange={(e) => setEditTableId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
                >
                  <option value="">Take Away / Delivery (No Table)</option>
                  {tables.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      Table {t.number} {t.name ? `(${t.name})` : ''} - {t.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--foreground)] mb-1">
                  Order Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] focus:border-brand-500 focus:outline-none"
                >
                  <option value="CONFIRMED">Confirmed / Waiting</option>
                  <option value="PREPARING">Preparing</option>
                  <option value="READY">Ready</option>
                  <option value="CLEAR">Clear</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]/60">
                <AppButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingOrder(null)}
                >
                  Cancel
                </AppButton>
                <AppButton
                  type="submit"
                  size="sm"
                  isLoading={isUpdating}
                  className="bg-brand-500 text-white border-none"
                >
                  Save Changes
                </AppButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs font-sans">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl animate-scale-in text-center">
            <AlertTriangle className="h-12 w-12 text-danger-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-[var(--foreground)]">
              Confirm Delete Order
            </h2>
            <p className="mt-2 text-xs text-[var(--muted-foreground)] max-w-sm mx-auto leading-relaxed">
              Are you sure you want to delete order <span className="font-bold text-[var(--foreground)]">{deletingOrder.code}</span>? This will permanently delete the transaction record, restore any recipe ingredients to stock, and release the table.
            </p>

            <div className="flex justify-center gap-3 pt-6 mt-6 border-t border-[var(--border)]/60">
              <AppButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeletingOrder(null)}
              >
                Cancel
              </AppButton>
              <AppButton
                type="button"
                size="sm"
                isLoading={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await apiClient.delete(`/orders/${deletingOrder.id}`);
                    refetch();
                    setDeletingOrder(null);
                  } catch (err: any) {
                    console.error(err);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="bg-danger-500 text-white hover:bg-danger-600 border-none animate-pulse"
              >
                Delete Order
              </AppButton>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {bulkDeletingIds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs font-sans">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl animate-scale-in text-center">
            <AlertTriangle className="h-12 w-12 text-danger-500 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-[var(--foreground)]">
              Konfirmasi Hapus {bulkDeletingIds.length} Order
            </h2>
            <p className="mt-2 text-xs text-[var(--muted-foreground)] max-w-sm mx-auto leading-relaxed">
              Apakah Anda yakin ingin menghapus <span className="font-bold text-[var(--foreground)]">{bulkDeletingIds.length}</span> record order terpilih secara permanen? Tindakan ini akan mengembalikan stok bahan baku untuk masing-masing order dan melepaskan meja yang terikat.
            </p>

            <div className="flex justify-center gap-3 pt-6 mt-6 border-t border-[var(--border)]/60">
              <AppButton
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBulkDeletingIds(null)}
              >
                Batal
              </AppButton>
              <AppButton
                type="button"
                size="sm"
                isLoading={isBulkDeleting}
                onClick={async () => {
                  setIsBulkDeleting(true);
                  try {
                    await Promise.all(
                      bulkDeletingIds.map(id => apiClient.delete(`/orders/${id}`))
                    );
                    setSelectedOrderIds([]);
                    refetch();
                    setBulkDeletingIds(null);
                  } catch (err: any) {
                    console.error(err);
                  } finally {
                    setIsBulkDeleting(false);
                  }
                }}
                className="bg-danger-500 text-white hover:bg-danger-600 border-none animate-pulse"
              >
                Hapus Semua
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

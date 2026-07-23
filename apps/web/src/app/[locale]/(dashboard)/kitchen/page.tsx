'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChefHat, Clock, Play, Check, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAppToast } from '@/hooks/use-app-toast';
import { cn } from '@/lib/utils';

interface KitchenItem {
  id: string;
  name: string;
  quantity: number;
  notes?: string | null;
  modifiers?: Array<{
    groupId: string;
    groupName: string;
    optionId: string;
    optionName: string;
    priceAdjustment: number;
  }> | null;
  isNew?: boolean;
}

interface KitchenTicket {
  id: string;
  orderId: string;
  orderNumber: string;
  orderType: 'DINE_IN' | 'TAKE_AWAY' | 'DELIVERY';
  tableNumber: string | null;
  customerName: string;
  notes?: string | null;
  createdAt: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  items: KitchenItem[];
  priority: number;
  isEdited?: boolean;
}

// Synthesize kitchen alarm alert using Web Audio API
function playPriorityAlarmSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playBeep = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    playBeep(880, now, 0.15);
    playBeep(660, now + 0.2, 0.15);
    playBeep(880, now + 0.4, 0.3);
  } catch (e) {
    console.warn('Failed to play alarm sound:', e);
  }
}

export default function KitchenPage() {
  const toast = useAppToast();
  const queryClient = useQueryClient();
  const [time, setTime] = React.useState(new Date());

  // Track previous tickets to detect new priority items
  const prevTicketsRef = React.useRef<KitchenTicket[]>([]);

  // Update clock/timers every 5 seconds
  React.useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch active kitchen tickets
  const { data: tickets = [], isLoading, error } = useQuery<KitchenTicket[]>({
    queryKey: ['kitchen-tickets'],
    queryFn: () => apiClient.get('/kitchen/orders'),
    refetchInterval: 3000, // Poll every 3 seconds for continuous operational flow
  });

  // Poll for tickets sound triggers
  React.useEffect(() => {
    if (!tickets || tickets.length === 0) {
      prevTicketsRef.current = [];
      return;
    }
    const prevPriorityIds = new Set(
      prevTicketsRef.current.filter((t) => (t as any).priority > 0).map((t) => t.id)
    );
    let hasNewPriority = false;
    tickets.forEach((t) => {
      if ((t as any).priority > 0 && !prevPriorityIds.has(t.id)) {
        hasNewPriority = true;
      }
    });
    if (hasNewPriority && prevTicketsRef.current.length > 0) {
      playPriorityAlarmSound();
      toast.rawSuccess('URGENT/PRIORITY order updated in Kitchen!');
    }
    prevTicketsRef.current = tickets;
  }, [tickets, toast]);

  // Ticket Status Transitions Mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ ticketId, status }: { ticketId: string; status: string }) =>
      apiClient.patch(`/kitchen/orders/${ticketId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-tickets'] });
      toast.rawSuccess('Ticket updated');
    },
    onError: (err: { message?: string }) => {
      toast.rawError(err.message || 'Failed to update ticket');
    },
  });

  // Order Completion Mutation
  const completeOrderMutation = useMutation({
    mutationFn: (ticketId: string) => apiClient.patch(`/kitchen/orders/${ticketId}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-tickets'] });
      toast.rawSuccess('Order completed and served!');
    },
    onError: (err: { message?: string }) => {
      toast.rawError(err.message || 'Failed to complete order');
    },
  });

  // Calculations for counters
  const waitingTickets = tickets.filter((t) => t.status === 'PENDING');
  const preparingTickets = tickets.filter((t) => t.status === 'IN_PROGRESS');
  const readyTickets = tickets.filter((t) => t.status === 'COMPLETED');

  const getElapsedTime = (createdAtStr: string) => {
    const created = new Date(createdAtStr);
    const diffMs = time.getTime() - created.getTime();
    if (isNaN(diffMs) || diffMs < 0) return '0m';
    const mins = Math.floor(diffMs / 60000);
    return `${mins} min`;
  };

  const getTimerSeverityColor = (createdAtStr: string) => {
    const created = new Date(createdAtStr);
    const diffMins = (time.getTime() - created.getTime()) / 60000;
    if (diffMins > 15) return 'text-rose-500 font-bold animate-pulse';
    if (diffMins > 8) return 'text-amber-500 font-semibold';
    return 'text-[var(--muted-foreground)]';
  };

  // Reusable KDS Ticket Card Component
  const TicketCard = ({ t, actionButton }: { t: KitchenTicket; actionButton: React.ReactNode }) => {
    const isCompleted = t.status === 'COMPLETED';

    return (
      <div
        className={cn(
          "rounded-2xl border p-4 shadow-sm space-y-3 relative transition-all duration-300",
          t.priority > 0
            ? "border-rose-500 bg-rose-500/5 hover:border-rose-600 shadow-md shadow-rose-500/10"
            : isCompleted
            ? "border-[var(--border)] bg-[var(--card)] hover:border-emerald-500/30"
            : t.status === 'IN_PROGRESS'
            ? "border-[var(--border)] bg-[var(--card)] hover:border-blue-500/30"
            : "border-[var(--border)] bg-[var(--card)] hover:border-orange-500/30"
        )}
      >
        {t.priority > 0 && (
          <div className="absolute -top-2.5 right-4 flex items-center gap-1 bg-rose-500 text-white font-bold text-[8px] uppercase px-2 py-0.5 rounded-full shadow-md animate-pulse">
            <AlertCircle className="h-2.5 w-2.5" /> Priority / Urgent
          </div>
        )}
        {t.isEdited && (
          <div className="absolute -top-2.5 left-4 flex items-center gap-1 bg-amber-500 text-white font-bold text-[8px] uppercase px-2 py-0.5 rounded-full shadow-md animate-pulse">
            <AlertCircle className="h-2.5 w-2.5" /> Tambahan Menu
          </div>
        )}
        {/* Card Header metadata */}
        <div className="flex justify-between items-start gap-2 border-b border-[var(--border)]/40 pb-2.5">
          <div>
            <h4 className="text-xs font-bold text-[var(--foreground)] truncate max-w-[130px]">
              {t.customerName}
            </h4>
            <p className="text-[10px] font-mono text-[var(--muted-foreground)] mt-0.5">
              {t.orderNumber}
            </p>
          </div>

          <div className="text-right">
            <span className={cn(
              "text-[9px] font-bold uppercase px-1.5 py-0.5 rounded leading-none block w-max ml-auto",
              t.orderType === 'DINE_IN'
                ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                : t.orderType === 'DELIVERY'
                ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
            )}>
              {t.orderType === 'DINE_IN'
                ? `Dine In (${t.tableNumber ? `T-${t.tableNumber}` : ''})`
                : t.orderType === 'DELIVERY'
                ? 'Delivery'
                : 'Takeaway'}
            </span>
            <span className={cn("text-[10px] font-mono block mt-1.5 leading-none", getTimerSeverityColor(t.createdAt))}>
              {getElapsedTime(t.createdAt)}
            </span>
          </div>
        </div>

        {/* Items List */}
        <div className="space-y-2">
          {t.items.map((item) => (
            <div key={item.id} className="text-xs">
              <div className="flex justify-between items-baseline text-[var(--foreground)]">
                <span className={cn("font-semibold flex items-center gap-1.5", isCompleted && "text-emerald-600")}>
                  {item.name}
                  {item.isNew && (
                    <span className="bg-amber-500 text-white font-bold text-[8px] uppercase px-1 rounded shadow-xs leading-none py-0.5 animate-pulse">
                      Baru
                    </span>
                  )}
                </span>
                <span className="font-mono font-bold text-brand-500 text-[11px] bg-brand-500/5 px-1.5 py-0.5 rounded">
                  x{item.quantity}
                </span>
              </div>
              {/* Item Modifiers */}
              {item.modifiers && item.modifiers.length > 0 && (
                <div className="text-[10px] text-brand-500 font-medium pl-2 mt-0.5 space-x-1">
                  {item.modifiers.map((m) => (
                    <span key={m.optionId}>+ {m.optionName}</span>
                  ))}
                </div>
              )}
              {/* Item Special Instructions */}
              {item.notes && (
                <p className="text-[10px] text-rose-500 italic pl-2 mt-0.5 font-medium">
                  * {item.notes}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* General order notes */}
        {t.notes && (
          <div className="bg-[var(--background)] p-2 rounded-xl border border-[var(--border)] text-[10px] text-[var(--muted-foreground)]">
            <span className="font-bold block uppercase text-[8px] tracking-wider text-[var(--muted-foreground)]/60">
              General Notes:
            </span>
            {t.notes}
          </div>
        )}

        {actionButton}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        <p className="text-sm font-semibold text-[var(--muted-foreground)]">
          Loading Kitchen Display System...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-3 text-danger-500">
        <AlertCircle className="h-8 w-8" />
        <p className="text-sm font-semibold">Failed to fetch kitchen orders queue.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KDS Header Dashboard */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border border-[var(--border)] bg-[var(--card)] p-5 rounded-[20px] shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-brand-500/10 text-brand-500 border border-brand-500/20 flex items-center justify-center">
            <ChefHat className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[var(--foreground)] tracking-tight leading-none">
              Kitchen Display System (KDS)
            </h1>
            <p className="text-xs text-[var(--muted-foreground)] mt-1 font-medium">
              Live orders preparation board.
            </p>
          </div>
        </div>

        {/* Live Status Stats & Time */}
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-orange-500 bg-orange-500/10 px-2.5 py-1 rounded-lg">
              Waiting: {waitingTickets.length}
            </span>
            <span className="flex items-center gap-1.5 text-blue-500 bg-blue-500/10 px-2.5 py-1 rounded-lg">
              Preparing: {preparingTickets.length}
            </span>
            <span className="flex items-center gap-1.5 text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
              Ready: {readyTickets.length}
            </span>
          </div>

          <div className="h-4 w-[1px] bg-[var(--border)] hidden sm:block" />

          {/* Clock */}
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[var(--foreground)] bg-[var(--background)] border border-[var(--border)] px-3 py-1.5 rounded-xl">
            <Clock className="h-3.5 w-3.5 text-brand-500" />
            {time.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      </div>

      {/* 3-Column Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Column 1: Waiting Queue */}
        <div className="flex flex-col min-h-[500px] border border-[var(--border)] rounded-[20px] bg-[var(--card)]/40 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 bg-orange-500/10 border-b border-[var(--border)]">
            <span className="text-xs font-black text-orange-600 tracking-wider uppercase">
              Waiting Queue
            </span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white font-mono">
              {waitingTickets.length}
            </span>
          </div>

          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            {waitingTickets.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)]/60 text-center py-10 font-medium">
                No orders waiting
              </p>
            ) : (
              waitingTickets.map((t) => (
                <TicketCard
                  key={t.id}
                  t={t}
                  actionButton={
                    <button
                      type="button"
                      disabled={updateStatusMutation.isPending}
                      onClick={() => updateStatusMutation.mutate({ ticketId: t.id, status: 'IN_PROGRESS' })}
                      className="w-full flex h-9 items-center justify-center gap-1 rounded-xl bg-orange-500 hover:bg-orange-600 text-xs font-bold text-white shadow-sm shadow-orange-500/10 cursor-pointer active:scale-[0.98] transition-all disabled:opacity-40"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Start Cooking
                    </button>
                  }
                />
              ))
            )}
          </div>
        </div>

        {/* Column 2: Preparing Queue */}
        <div className="flex flex-col min-h-[500px] border border-[var(--border)] rounded-[20px] bg-[var(--card)]/40 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 bg-blue-500/10 border-b border-[var(--border)]">
            <span className="text-xs font-black text-blue-600 tracking-wider uppercase">
              Preparing Queue
            </span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white font-mono">
              {preparingTickets.length}
            </span>
          </div>

          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            {preparingTickets.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)]/60 text-center py-10 font-medium">
                No orders in preparation
              </p>
            ) : (
              preparingTickets.map((t) => (
                <TicketCard
                  key={t.id}
                  t={t}
                  actionButton={
                    <button
                      type="button"
                      disabled={updateStatusMutation.isPending}
                      onClick={() => updateStatusMutation.mutate({ ticketId: t.id, status: 'COMPLETED' })}
                      className="w-full flex h-9 items-center justify-center gap-1 rounded-xl bg-blue-500 hover:bg-blue-600 text-xs font-bold text-white shadow-sm shadow-blue-500/10 cursor-pointer active:scale-[0.98] transition-all disabled:opacity-40"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Ready
                    </button>
                  }
                />
              ))
            )}
          </div>
        </div>

        {/* Column 3: Ready Queue */}
        <div className="flex flex-col min-h-[500px] border border-[var(--border)] rounded-[20px] bg-[var(--card)]/40 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 bg-emerald-500/10 border-b border-[var(--border)]">
            <span className="text-xs font-black text-emerald-600 tracking-wider uppercase">
              Ready Queue
            </span>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white font-mono">
              {readyTickets.length}
            </span>
          </div>

          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            {readyTickets.length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)]/60 text-center py-10 font-medium">
                No orders ready for pickup
              </p>
            ) : (
              readyTickets.map((t) => (
                <TicketCard
                  key={t.id}
                  t={t}
                  actionButton={
                    <button
                      type="button"
                      disabled={completeOrderMutation.isPending}
                      onClick={() => completeOrderMutation.mutate(t.id)}
                      className="w-full flex h-9 items-center justify-center gap-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-xs font-bold text-white shadow-sm shadow-emerald-500/10 cursor-pointer active:scale-[0.98] transition-all disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4" />
                      Complete & Serve
                    </button>
                  }
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { UtensilsCrossed, ShoppingBag, Bike, AlertCircle } from 'lucide-react';

interface OrderCardProps {
  id: string;
  code: string;
  customerName: string;
  table: string;
  itemCount: number;
  status: string;
  elapsedTime: string;
  isPriority?: boolean;
  onClick?: () => void;
}

export function OrderCard({
  customerName,
  table,
  itemCount,
  status,
  elapsedTime,
  isPriority,
  onClick,
}: OrderCardProps) {
  // Map internal database status to POS-friendly color badges (Preparing, Ready, Waiting, Clear)
  const getPosStatus = (stat: string) => {
    const upper = stat.toUpperCase();
    if (upper === 'PENDING') {
      return {
        label: 'BELUM BAYAR',
        classes: 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse',
      };
    }
    if (upper === 'PREPARING') {
      return {
        label: 'PREPARING',
        classes: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      };
    }
    if (upper === 'READY') {
      return {
        label: 'READY',
        classes: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
      };
    }
    if (upper === 'CLEAR' || upper === 'COMPLETED') {
      return {
        label: 'CLEAR',
        classes: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      };
    }
    // WAITING, DRAFT, PENDING_PAYMENT, PAID, QUEUED, etc.
    return {
      label: 'WAITING',
      classes: 'bg-zinc-500/15 text-[var(--muted-foreground)] border-[var(--border)]',
    };
  };

  // Map location string to Lucide icon and colored circular border classes
  const getLocationDetails = (loc: string) => {
    const lower = loc.toLowerCase();
    if (lower.includes('takeaway') || lower.includes('take away')) {
      return {
        icon: ShoppingBag,
        circleClasses: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      };
    }
    if (lower.includes('delivery') || lower.includes('gojek') || lower.includes('grab')) {
      return {
        icon: Bike,
        circleClasses: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      };
    }
    // Default to Dine In
    return {
      icon: UtensilsCrossed,
      circleClasses: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    };
  };

  const posStatus = getPosStatus(status);
  const locationDetails = getLocationDetails(table);
  const LocationIcon = locationDetails.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex gap-4 w-[260px] h-[120px] shrink-0 border bg-[var(--card)] p-4 rounded-2xl transition-all duration-200 hover:border-brand-500/50 hover:shadow-sm cursor-pointer select-none text-left active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
        isPriority
          ? "border-rose-500/55 shadow-[0_0_12px_rgba(244,63,94,0.15)] bg-rose-500/5"
          : "border-[var(--border)]"
      )}
    >
      {/* Left Column: Circular Icon Container */}
      <div className={cn(
        'h-10 w-10 rounded-full flex items-center justify-center shrink-0 border',
        isPriority
          ? 'bg-rose-500/20 text-rose-500 border-rose-500/30 animate-pulse'
          : locationDetails.circleClasses
      )}>
        {isPriority ? <AlertCircle className="h-4.5 w-4.5 animate-bounce" /> : <LocationIcon className="h-4.5 w-4.5" />}
      </div>

      {/* Right Column: Name, Location, Items, Status & Elapsed Time */}
      <div className="flex-1 flex flex-col justify-between min-w-0 h-full">
        <div className="leading-tight">
          <p className="truncate text-sm font-semibold text-[var(--foreground)]">
            {customerName}
          </p>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            {table}
          </p>
        </div>

        <p className="text-xs text-[var(--muted-foreground)] leading-none mt-1">
          {itemCount} {itemCount === 1 ? 'item' : 'items'}
        </p>

        {/* Bottom Row */}
        <div className="flex items-center justify-between mt-2">
          <span className={cn('px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border leading-none', posStatus.classes)}>
            {posStatus.label}
          </span>
          <span className="text-[10px] text-[var(--muted-foreground)] font-sans">
            {elapsedTime}
          </span>
        </div>
      </div>
    </button>
  );
}

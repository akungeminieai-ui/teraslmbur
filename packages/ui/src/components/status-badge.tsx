import * as React from 'react';
import { cn } from '@teras-lmbur/utils';
import { OrderStatus, KitchenTicketStatus, TableStatus, PurchaseStatus } from '@teras-lmbur/types';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand';

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-[var(--muted)] text-[var(--muted-foreground)]',
  success: 'bg-success-500/10 text-success-500',
  warning: 'bg-warning-500/10 text-warning-500',
  danger: 'bg-danger-500/10 text-danger-500',
  info: 'bg-info-500/10 text-info-500',
  brand: 'bg-brand-500/10 text-brand-500',
};

function getVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    DRAFT: 'default',
    PENDING: 'warning',
    CONFIRMED: 'info',
    PREPARING: 'brand',
    READY: 'success',
    ON_DELIVERY: 'info',
    COMPLETED: 'success',
    CANCELLED: 'danger',
    IN_PROGRESS: 'brand',
    VOIDED: 'danger',
    AVAILABLE: 'success',
    OCCUPIED: 'brand',
    RESERVED: 'warning',
    MAINTENANCE: 'danger',
    ORDERED: 'info',
    RECEIVED: 'success',
  };

  return map[status] ?? 'default';
}

function formatStatus(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ className, status, ...props }, ref) => {
    const variant = getVariant(status);
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors',
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {formatStatus(status)}
      </span>
    );
  }
);
StatusBadge.displayName = 'StatusBadge';

import { cn } from '@/lib/utils';


type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-[var(--muted)] text-[var(--muted-foreground)]',
  success: 'bg-success-500/10 text-success-500',
  warning: 'bg-warning-500/10 text-warning-500',
  danger: 'bg-danger-500/10 text-danger-500',
  info: 'bg-info-500/10 text-info-500',
  brand: 'bg-brand-500/10 text-brand-500',
};

/** Maps status enums to badge variants */
function getVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    DRAFT: 'default',
    PENDING: 'warning',
    CONFIRMED: 'info',
    PREPARING: 'brand',
    READY: 'success',
    ON_DELIVERY: 'info',
    COMPLETED: 'success',
    CLEAR: 'success',
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

/** Format status for display (e.g., ON_DELIVERY → On Delivery) */
function formatStatus(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = getVariant(status);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
        variantStyles[variant],
        className,
      )}
    >
      {formatStatus(status)}
    </span>
  );
}

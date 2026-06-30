import * as React from 'react';
import { cn } from '@teras-lmbur/utils';
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react';
import type { TrendDirection } from '@teras-lmbur/types';

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  trend?: {
    value: number;
    direction: TrendDirection;
    label: string;
  };
  icon: LucideIcon;
}

const trendConfig = {
  up: { icon: TrendingUp, color: 'text-success-500', bg: 'bg-success-500/10' },
  down: { icon: TrendingDown, color: 'text-danger-500', bg: 'bg-danger-500/10' },
  neutral: { icon: Minus, color: 'text-[var(--muted-foreground)]', bg: 'bg-[var(--muted)]/50' },
};

export const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, label, value, trend, icon: Icon, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'group relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 transition-all duration-200 hover:border-[var(--muted-foreground)]/30 hover:shadow-md',
          className
        )}
        {...props}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/[0.02] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="relative flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-xs font-medium text-[var(--muted-foreground)]">{label}</p>
            <p className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{value}</p>
            {trend && (
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    'flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium',
                    trendConfig[trend.direction].bg,
                    trendConfig[trend.direction].color
                  )}
                >
                  {(() => {
                    const TrendIcon = trendConfig[trend.direction].icon;
                    return <TrendIcon className="h-3 w-3" />;
                  })()}
                  {trend.value}%
                </div>
                <span className="text-[11px] text-[var(--muted-foreground)]">{trend.label}</span>
              </div>
            )}
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </div>
    );
  }
);
StatCard.displayName = 'StatCard';

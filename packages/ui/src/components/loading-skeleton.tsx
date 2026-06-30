import * as React from 'react';
import { cn } from '@teras-lmbur/utils';

export const Skeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('animate-pulse rounded-lg bg-[var(--muted)]', className)}
        {...props}
      />
    );
  }
);
Skeleton.displayName = 'Skeleton';

export const StatCardSkeleton = () => (
  <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
    <div className="flex items-start justify-between">
      <div className="space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-10 w-10 rounded-lg" />
    </div>
  </div>
);

export const TableRowSkeleton = ({ columns = 5 }: { columns?: number }) => (
  <div className="flex items-center gap-4 border-b border-[var(--border)] px-4 py-3">
    {Array.from({ length: columns }).map((_, i) => (
      <Skeleton key={i} className="h-4 flex-1" />
    ))}
  </div>
);

export const PageSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-60" />
      </div>
      <Skeleton className="h-9 w-24 rounded-lg" />
    </div>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]">
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRowSkeleton key={i} />
      ))}
    </div>
  </div>
);

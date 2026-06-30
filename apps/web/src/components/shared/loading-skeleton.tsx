import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  className?: string;
}

export function Skeleton({ className }: LoadingSkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-[var(--muted)]',
        className,
      )}
    />
  );
}

/** Skeleton preset for stat cards */
export function StatCardSkeleton() {
  return (
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
}

/** Skeleton preset for table rows */
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 border-b border-[var(--border)] px-4 py-3">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
  );
}

/** Skeleton preset for a full page */
export function PageSkeleton() {
  return (
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
}

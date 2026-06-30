import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] px-6 py-16',
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-[var(--foreground)]">{title}</h3>
      <p className="mt-1 max-w-sm text-center text-sm text-[var(--muted-foreground)]">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

import * as React from 'react';
import { cn } from '@teras-lmbur/utils';
import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
}

export const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, title, description, icon: Icon, actions, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', className)}
        {...props}
      >
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/10 text-brand-500">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">{title}</h1>
            {description && (
              <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    );
  }
);
PageHeader.displayName = 'PageHeader';

import * as React from 'react';
import { cn } from '@teras-lmbur/utils';

interface SummaryCardItem {
  label: string;
  value: string | number;
  subValue?: string | number;
}

interface SummaryCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  items: SummaryCardItem[];
  footerAction?: React.ReactNode;
}

export const SummaryCard = React.forwardRef<HTMLDivElement, SummaryCardProps>(
  ({ className, title, items, footerAction, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]',
          className
        )}
        {...props}
      >
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {items.map((item, index) => (
            <div key={index} className="flex items-center justify-between px-5 py-3 text-sm">
              <div>
                <p className="font-medium">{item.label}</p>
                {item.subValue && (
                  <p className="text-xs text-[var(--muted-foreground)]">{item.subValue}</p>
                )}
              </div>
              <span className="font-semibold">{item.value}</span>
            </div>
          ))}
        </div>
        {footerAction && (
          <div className="border-t border-[var(--border)] px-5 py-3">
            {footerAction}
          </div>
        )}
      </div>
    );
  }
);
SummaryCard.displayName = 'SummaryCard';

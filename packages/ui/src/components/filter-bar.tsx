import * as React from 'react';
import { cn } from '@teras-lmbur/utils';
import { X } from 'lucide-react';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps extends React.HTMLAttributes<HTMLDivElement> {
  options: FilterOption[];
  selectedValue?: string;
  onChange: (value: string) => void;
  onClear?: () => void;
}

export const FilterBar = React.forwardRef<HTMLDivElement, FilterBarProps>(
  ({ className, options, selectedValue, onChange, onClear, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex flex-wrap items-center gap-1.5', className)}
        {...props}
      >
        {options.map((option) => {
          const isSelected = selectedValue === option.value;
          return (
            <button
              key={option.value}
              onClick={() => onChange(option.value)}
              className={cn(
                'inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150',
                isSelected
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]'
              )}
            >
              {option.label}
            </button>
          );
        })}
        {selectedValue && onClear && (
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-danger-500 transition-colors hover:bg-danger-500/10"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>
    );
  }
);
FilterBar.displayName = 'FilterBar';

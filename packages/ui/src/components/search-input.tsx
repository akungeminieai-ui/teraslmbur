import * as React from 'react';
import { cn } from '@teras-lmbur/utils';
import { Search } from 'lucide-react';

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (value: string) => void;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onSearch, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) onChange(e);
      if (onSearch) onSearch(e.target.value);
    };

    return (
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none" />
        <input
          ref={ref}
          type="search"
          onChange={handleChange}
          className={cn(
            'flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] pl-10 pr-4 py-2 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
SearchInput.displayName = 'SearchInput';

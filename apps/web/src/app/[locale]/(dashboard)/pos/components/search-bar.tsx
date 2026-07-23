'use client';

import * as React from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function SearchBar({ value, onChange, placeholder, inputRef }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-[var(--muted-foreground)]/85" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-11 pr-4 text-xs sm:text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/80 focus:border-brand-500 focus:outline-none transition-colors"
      />
    </div>
  );
}

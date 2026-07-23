'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface CategoryTabsProps {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
  allLabel: string;
}

export function CategoryTabs({ categories, selected, onSelect, allLabel }: CategoryTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 pt-1 scrollbar-none select-none">
      {categories.map((cat) => {
        const isActive = selected === cat;
        const label = cat === 'All' ? allLabel : cat;
        return (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            className={cn(
              'shrink-0 rounded-xl px-4 text-xs font-semibold transition-all cursor-pointer h-8 flex items-center justify-center',
              'border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
              isActive
                ? 'bg-brand-500 border-brand-500 text-white shadow-md shadow-brand-500/10'
                : 'bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--muted-foreground)]/50',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

'use client';

import * as React from 'react';
import { ShoppingBag } from 'lucide-react';

interface EmptyCartProps {
  message: string;
}

export function EmptyCart({ message }: EmptyCartProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center p-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-500/10 text-brand-500 border border-brand-500/15 mb-4">
        <ShoppingBag className="h-6 w-6" />
      </div>
      <p className="text-xs text-[var(--muted-foreground)] max-w-[200px] leading-relaxed">{message}</p>
    </div>
  );
}

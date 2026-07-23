'use client';

import type { ReactNode } from 'react';
import { QueryProvider } from '@/providers/query-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { Toaster } from 'sonner';

/**
 * Minimal layout for public-facing pages (no sidebar, no header, no auth).
 * Used by the customer self-order page.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider>
        <div className="min-h-screen bg-[var(--background)]">
          {children}
        </div>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: 'var(--card)',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
            },
          }}
        />
      </ThemeProvider>
    </QueryProvider>
  );
}

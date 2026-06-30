'use client';

import type { ReactNode } from 'react';
import { ThemeProvider } from './theme-provider';
import { QueryProvider } from './query-provider';
import { Toaster } from 'sonner';

interface AppProvidersProps {
  children: ReactNode;
}

/**
 * Composed provider tree for the application.
 * Order matters: outermost providers wrap innermost.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryProvider>
      <ThemeProvider>
        {children}
        <Toaster
          position="bottom-right"
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

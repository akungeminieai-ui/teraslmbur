'use client';

import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layouts/sidebar';
import { Header } from '@/components/layouts/header';
import { SidebarProvider, useSidebar } from '@/hooks/use-sidebar';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from '@/components/shared/error-boundary';

import { useEffect } from 'react';

function DashboardContent({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebar();

  // Global: auto-select number input content on focus so users don't need
  // to manually delete "0" before typing a new value.
  useEffect(() => {
    const handler = (e: FocusEvent) => {
      const el = e.target;
      if (el instanceof HTMLInputElement && el.type === 'number') {
        // Small delay to let the browser finish setting focus
        requestAnimationFrame(() => el.select());
      }
    };
    document.addEventListener('focusin', handler);
    return () => document.removeEventListener('focusin', handler);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Sidebar />
      <Header />
      <main
        className={cn(
          'sidebar-transition px-6 py-6 ml-[var(--sidebar-collapsed)]',
          !collapsed && 'md:ml-[var(--sidebar-expanded)]',
        )}
      >
        <div className="mx-auto max-w-[1400px] animate-fade-in">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
}

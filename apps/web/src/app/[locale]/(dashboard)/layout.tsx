'use client';

import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layouts/sidebar';
import { Header } from '@/components/layouts/header';
import { SidebarProvider, useSidebar } from '@/hooks/use-sidebar';
import { cn } from '@/lib/utils';

function DashboardContent({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Sidebar />
      <Header />
      <main
        className={cn(
          'sidebar-transition px-6 py-6',
          collapsed ? 'ml-[var(--sidebar-collapsed)]' : 'ml-[var(--sidebar-expanded)]',
        )}
      >
        <div className="mx-auto max-w-[1400px] animate-fade-in">{children}</div>
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

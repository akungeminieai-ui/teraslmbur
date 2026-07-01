'use client';

import { Link, usePathname } from '@/i18n/routing';
import {
  LayoutDashboard,
  ShoppingCart,
  ChefHat,
  Package,
  Tags,
  Armchair,
  Warehouse,
  FileBarChart,
  TrendingUp,
  Users,
  Settings,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/hooks/use-sidebar';
import { navigationConfig, siteConfig } from '@/config/site';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import type { NavSection } from '@teras-lmbur/types';

/** Map icon string names to Lucide components */
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  ShoppingCart,
  ChefHat,
  Package,
  Tags,
  Armchair,
  Warehouse,
  FileBarChart,
  TrendingUp,
  Users,
  Settings,
};

export function Sidebar() {
  const { collapsed, toggle } = useSidebar();
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'sidebar-transition fixed left-0 top-0 z-40 flex h-screen flex-col border-r',
        'bg-[var(--sidebar-bg)] border-[var(--sidebar-border)]',
        collapsed ? 'w-[var(--sidebar-collapsed)]' : 'w-[var(--sidebar-expanded)]',
      )}
    >
      {/* Logo / Brand */}
      <div
        className={cn(
          'flex h-16 items-center border-b border-[var(--sidebar-border)] px-4',
          collapsed ? 'justify-center' : 'gap-3',
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white">
          <span className="text-sm font-bold">TL</span>
        </div>
        {!collapsed && (
          <div className="animate-fade-in overflow-hidden">
            <h1 className="truncate text-sm font-semibold text-[var(--foreground)]">
              {siteConfig.name}
            </h1>
            <p className="truncate text-[10px] text-[var(--muted-foreground)]">Restaurant OS</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navigationConfig.map((section: NavSection) => (
          <div key={section.title} className="mb-4">
            {!collapsed && (
              <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                {section.title}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = iconMap[item.icon] ?? LayoutDashboard;
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.title : undefined}
                    className={cn(
                      'group flex items-center rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150',
                      collapsed ? 'justify-center' : 'gap-3',
                      isActive
                        ? 'bg-brand-500/10 text-brand-500'
                        : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-[18px] w-[18px] shrink-0 transition-colors',
                        isActive ? 'text-brand-500' : 'text-[var(--muted-foreground)] group-hover:text-[var(--foreground)]',
                      )}
                    />
                    {!collapsed && (
                      <span className="animate-fade-in truncate">{item.title}</span>
                    )}
                    {!collapsed && item.badge !== undefined && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500/15 px-1.5 text-[10px] font-semibold text-brand-500">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-[var(--sidebar-border)] p-3">
        {/* Theme Toggle */}
        <div className={cn('mb-2 flex', collapsed ? 'justify-center' : 'justify-start px-1')}>
          <ThemeToggle />
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={toggle}
          className={cn(
            'flex w-full items-center rounded-lg px-2.5 py-2 text-sm text-[var(--muted-foreground)]',
            'transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]',
            collapsed ? 'justify-center' : 'gap-3',
          )}
        >
          {collapsed ? (
            <PanelLeft className="h-[18px] w-[18px]" />
          ) : (
            <>
              <PanelLeftClose className="h-[18px] w-[18px]" />
              <span className="animate-fade-in">Collapse</span>
            </>
          )}
        </button>

        {/* User Profile */}
        <div
          className={cn(
            'mt-2 flex items-center rounded-lg px-2.5 py-2',
            collapsed ? 'justify-center' : 'gap-3',
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-xs font-semibold text-brand-500">
            OW
          </div>
          {!collapsed && (
            <div className="animate-fade-in min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-[var(--foreground)]">Owner</p>
              <p className="truncate text-[10px] text-[var(--muted-foreground)]">
                owner@teraslmbur.com
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              className="shrink-0 text-[var(--muted-foreground)] transition-colors hover:text-danger-500"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

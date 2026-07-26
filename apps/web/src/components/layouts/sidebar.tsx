'use client';

import * as React from 'react';
import { Link, usePathname } from '@/i18n/routing';
import {
  LayoutDashboard,
  ShoppingCart,
  ChefHat,
  Package,
  Tags,
  Sliders,
  Armchair,
  Warehouse,
  FileBarChart,
  TrendingUp,
  Users,
  Settings,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  Scale,
  Apple,
  CreditCard,
  QrCode,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/hooks/use-sidebar';
import { navigationConfig, siteConfig } from '@/config/site';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import type { NavSection } from '@teras-lmbur/types';
import { useAuth } from '@/providers/auth-provider';
import { useTranslations } from 'next-intl';

/** Map icon string names to Lucide components */
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  ShoppingCart,
  ChefHat,
  Package,
  Tags,
  Sliders,
  Armchair,
  Warehouse,
  FileBarChart,
  TrendingUp,
  Users,
  Settings,
  Scale,
  Apple,
  CreditCard,
  QrCode,
};

export const Sidebar = React.memo(function Sidebar() {
  const { collapsed, toggle } = useSidebar();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const t = useTranslations('common');

  const [brandName, setBrandName] = React.useState('Teras Lmbur OS');
  const [brandLogo, setBrandLogo] = React.useState('');

  React.useEffect(() => {
    const loadSettings = () => {
      try {
        const saved = localStorage.getItem('teras_lmbur_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.restaurantName || parsed.logoText) {
            setBrandName(parsed.restaurantName || parsed.logoText);
          }
          if (parsed.brandLogo) {
            setBrandLogo(parsed.brandLogo);
          }
        }
      } catch {
        // Ignore error
      }
    };

    loadSettings();
    window.addEventListener('teras_lmbur_settings_updated', loadSettings);
    return () => window.removeEventListener('teras_lmbur_settings_updated', loadSettings);
  }, []);

  const initials = user?.name
    ? user.name
        .split(' ')
        .filter(Boolean)
        .map((n: string) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'OW';

  const hasPermission = React.useCallback(
    (perm?: string) => {
      if (!perm) return true;
      if (!user?.role?.permissions) return false;
      return user.role.permissions.includes(perm);
    },
    [user],
  );

  return (
    <aside
      className={cn(
        'sidebar-transition fixed left-0 top-0 z-40 flex h-screen flex-col border-r',
        'bg-[var(--sidebar-bg)] border-[var(--sidebar-border)]',
        'w-[var(--sidebar-collapsed)]',
        !collapsed && 'md:w-[var(--sidebar-expanded)]',
      )}
    >
      {/* Logo / Brand */}
      <Link
        href="/dashboard"
        prefetch={false}
        className={cn(
          'flex h-16 items-center border-b border-[var(--sidebar-border)] px-4 justify-center md:gap-3 cursor-pointer hover:opacity-90 transition-opacity w-full',
          !collapsed && 'md:justify-start',
        )}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white shadow-glow overflow-hidden">
          {brandLogo ? (
            <img src={brandLogo} alt="Logo" className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-bold">{brandName.substring(0, 2).toUpperCase()}</span>
          )}
        </div>
        {!collapsed && (
          <div className="animate-fade-in overflow-hidden hidden md:block">
            <h1 className="truncate text-sm font-semibold text-[var(--foreground)]">
              {brandName}
            </h1>
            <p className="truncate text-[10px] text-[var(--muted-foreground)]">{t('app.tagline')}</p>
          </div>
        )}
      </Link>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navigationConfig.map((section: NavSection) => {
          const sectionTitleKey = `sections.${section.title.toLowerCase()}`;
          const sectionTitle = t.has(sectionTitleKey) ? t(sectionTitleKey) : section.title;

          // Filter items based on user permissions and role constraints
          const visibleItems = section.items.filter((item) => {
            const hasPerm = hasPermission(item.permission);
            if (!hasPerm) return false;

            const role = user?.role?.name?.toUpperCase();

            // Staff / Cashier / Operator limited workspace mode
            if (role === 'CASHIER' || role === 'OPERATOR' || role === 'STAFF') {
              const staffAllowed = ['/dashboard', '/pos', '/orders', '/kitchen', '/tables', '/settings/qr-menu'];
              return staffAllowed.includes(item.href);
            }
            if (role === 'KITCHEN') {
              const kitchenAllowed = [
                '/dashboard',
                '/orders',
                '/kitchen',
                '/products',
                '/modifiers',
                '/units',
                '/ingredients',
                '/inventory',
              ];
              return kitchenAllowed.includes(item.href);
            }

            // Default (OWNER / SUPER_ADMIN / ADMIN): Show all authorized items
            return true;
          });

          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} className="mb-4">
              {!collapsed && (
                <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] hidden md:block">
                  {sectionTitle}
                </p>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = iconMap[item.icon] ?? LayoutDashboard;
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const itemTitleKey = `sidebar.${item.href.replace('/', '')}`;
                  const itemTitle = t.has(itemTitleKey) ? t(itemTitleKey) : item.title;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      title={collapsed ? itemTitle : undefined}
                      className={cn(
                        'group relative flex items-center rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150',
                        collapsed ? 'justify-center' : 'gap-3',
                        isActive
                          ? 'bg-brand-500/10 text-brand-500 font-semibold'
                          : 'text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]',
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r bg-brand-500" />
                      )}
                      <Icon
                        className={cn(
                          'h-[18px] w-[18px] shrink-0 transition-colors',
                          isActive ? 'text-brand-500' : 'text-[var(--muted-foreground)] group-hover:text-[var(--foreground)]',
                        )}
                      />
                      {!collapsed && (
                        <span className="animate-fade-in truncate hidden md:inline">{itemTitle}</span>
                      )}
                      {!collapsed && item.badge !== undefined && (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500/15 px-1.5 text-[10px] font-semibold text-brand-500 hidden md:flex">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
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
              <PanelLeftClose className="h-[18px] w-[18px] hidden md:block" />
              <PanelLeft className="h-[18px] w-[18px] md:hidden" />
              <span className="animate-fade-in hidden md:inline">{t('sidebar.collapse') || 'Collapse'}</span>
            </>
          )}
        </button>

        {/* User Profile */}
        <div
          className={cn(
            'mt-2 flex items-center rounded-lg px-2.5 py-2 justify-between gap-3',
            collapsed && 'justify-center',
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500/20 text-xs font-semibold text-brand-500">
              {initials}
            </div>
            {!collapsed && (
              <div className="animate-fade-in min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-[var(--foreground)]">
                  {user?.name || t('sidebar.owner') || 'Owner'}
                </p>
                <p className="truncate text-[10px] text-[var(--muted-foreground)]">
                  {user?.email || 'owner@teraslmbur.com'}
                </p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={logout}
              className="shrink-0 text-[var(--muted-foreground)] transition-colors hover:text-danger-500 cursor-pointer p-1"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
});

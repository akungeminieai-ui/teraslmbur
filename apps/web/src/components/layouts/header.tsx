'use client';

import * as React from 'react';
import { usePathname, Link, useRouter } from '@/i18n/routing';
import { Search, Bell, ChevronRight, LogOut, Globe, User, AlertTriangle, Coffee, ShoppingCart, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/hooks/use-sidebar';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Dialog from '@radix-ui/react-dialog';
import { apiClient } from '@/lib/api-client';
import { AppButton } from '@teras-lmbur/ui';

function getBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  return segments.map((segment, index) => ({
    label: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
    href: '/' + segments.slice(0, index + 1).join('/'),
    isLast: index === segments.length - 1,
  }));
}

export const Header = React.memo(function Header() {
  const pathname = usePathname();
  const { collapsed } = useSidebar();
  const breadcrumbs = getBreadcrumbs(pathname);
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('common');
  const { user } = useAuth();

  // Global Search State
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<{ products: any[]; orders: any[] }>({ products: [], orders: [] });
  const [isSearching, setIsSearching] = React.useState(false);

  // Notifications State
  const [notifications, setNotifications] = React.useState<any[]>([]);

  // Fetch search results when query changes
  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ products: [], orders: [] });
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      try {
        const [prodRes, orderRes] = await Promise.all([
          apiClient.get<any>(`/products?search=${encodeURIComponent(searchQuery)}&pageSize=5`),
          apiClient.get<any>(`/orders?search=${encodeURIComponent(searchQuery)}&pageSize=5`),
        ]);

        setSearchResults({
          products: prodRes?.items || [],
          orders: orderRes?.items || [],
        });
      } catch (err) {
        console.error('Error global searching', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Fetch notification alerts (low stock warning count, cancellations, etc.)
  React.useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const stats = await apiClient.get<any>(`/analytics/dashboard?locale=${locale}`);
        const lowStockAlerts = (stats?.lowStock || []).map((item: any) => ({
          id: `low-${item.name}`,
          type: 'warning',
          title: 'Low Stock Alert',
          description: `${item.name} is running low (${item.current} ${item.unit} left)`,
          href: '/inventory',
        }));

        const recentOrders = stats?.recentOrders || [];
        const cancelledAlerts = recentOrders
          .filter((o: any) => o.status === 'CANCELLED')
          .map((o: any) => ({
            id: `cancel-${o.code}`,
            type: 'cancel',
            title: 'Order Cancelled',
            description: `Order ${o.code} has been cancelled`,
            href: '/orders',
          }));

        setNotifications([...lowStockAlerts, ...cancelledAlerts]);
      } catch {
        // Fallback or ignore background notification failure
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [locale]);

  const handleLanguageChange = (nextLocale: 'en' | 'id') => {
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    localStorage.setItem('NEXT_LOCALE', nextLocale);

    const queryString = searchParams.toString();
    const fullPath = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(fullPath, { locale: nextLocale });
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userProfile');
    localStorage.removeItem('userPermissions');
    document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    window.location.href = `/${locale}/login`;
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-16 items-center justify-between border-b px-6',
        'bg-[var(--header-bg)] backdrop-blur-xl border-[var(--border)]',
        'sidebar-transition',
        'ml-[var(--sidebar-collapsed)]',
        !collapsed && 'md:ml-[var(--sidebar-expanded)]',
      )}
    >
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb) => (
          <div key={crumb.href} className="flex items-center gap-1 min-w-0">
            {!crumb.isLast ? (
              <>
                <Link
                  href={crumb.href}
                  className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)] truncate max-w-[80px] sm:max-w-none inline-block align-bottom"
                >
                  {t.has(`sidebar.${crumb.label.toLowerCase()}`) ? t(`sidebar.${crumb.label.toLowerCase()}`) : crumb.label}
                </Link>
                <ChevronRight className="h-3.5 w-3.5 text-[var(--muted-foreground)] shrink-0" />
              </>
            ) : (
              <span className="font-semibold text-[var(--foreground)] truncate max-w-[120px] sm:max-w-none inline-block align-bottom" aria-current="page">
                {t.has(`sidebar.${crumb.label.toLowerCase()}`) ? t(`sidebar.${crumb.label.toLowerCase()}`) : crumb.label}
              </span>
            )}
          </div>
        ))}
      </nav>

      {/* Right Side Actions */}
      <div className="flex items-center gap-4">
        {/* Global Search Dialog */}
        <Dialog.Root open={isSearchOpen} onOpenChange={setIsSearchOpen}>
          <Dialog.Trigger asChild>
            <button
              className="relative flex h-9 w-40 items-center justify-start rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-left text-xs text-[var(--muted-foreground)] transition-all hover:border-[var(--muted-foreground)]/30 md:w-64 cursor-pointer"
              title="Search System (⌘K)"
            >
              <Search className="mr-2 h-3.5 w-3.5" />
              <span className="flex-1">{t('searchPlaceholder')}</span>
              <kbd className="hidden rounded border border-[var(--border)] bg-[var(--background)] px-1.5 py-0.5 text-[10px] font-medium md:inline">
                ⌘K
              </kbd>
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in" />
            <Dialog.Content className="fixed left-1/2 top-1/3 z-50 w-full max-w-lg -translate-x-1/2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-2xl focus:outline-none animate-scale-in">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Type to search products or orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-10 pr-8 text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {/* Search Results Display */}
              <div className="mt-4 max-h-72 overflow-y-auto space-y-4">
                {isSearching ? (
                  <div className="flex items-center justify-center p-6 gap-2 text-xs text-[var(--muted-foreground)]">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
                    Searching...
                  </div>
                ) : !searchQuery ? (
                  <div className="p-6 text-center text-xs text-[var(--muted-foreground)]">
                    Type keywords to search products or order codes...
                  </div>
                ) : searchResults.products.length === 0 && searchResults.orders.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[var(--muted-foreground)]">
                    No matching products or orders found.
                  </div>
                ) : (
                  <>
                    {/* Products list */}
                    {searchResults.products.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] px-2 mb-1">
                          Products
                        </h4>
                        <div className="space-y-0.5">
                          {searchResults.products.map((p) => {
                            const name = p.translations?.find((tr: any) => tr.locale === locale)?.name || p.slug;
                            return (
                              <button
                                key={p.id}
                                onClick={() => {
                                  setIsSearchOpen(false);
                                  router.push(`/products?search=${encodeURIComponent(name)}`);
                                }}
                                className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-[var(--accent)] text-[var(--foreground)] cursor-pointer"
                              >
                                <Coffee className="h-3.5 w-3.5 text-brand-500" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold truncate">{name}</p>
                                  <p className="text-[10px] text-[var(--muted-foreground)] font-mono">{p.sku || 'No SKU'}</p>
                                </div>
                                <span className="font-mono font-semibold">{parseFloat(p.sellingPrice).toFixed(2)} EGP</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Orders list */}
                    {searchResults.orders.length > 0 && (
                      <div>
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] px-2 mb-1">
                          Orders
                        </h4>
                        <div className="space-y-0.5">
                          {searchResults.orders.map((o) => (
                            <button
                              key={o.id}
                              onClick={() => {
                                  setIsSearchOpen(false);
                                  router.push(`/orders?search=${encodeURIComponent(o.code)}`);
                              }}
                              className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-[var(--accent)] text-[var(--foreground)] cursor-pointer"
                            >
                              <ShoppingCart className="h-3.5 w-3.5 text-brand-500" />
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-brand-500 font-mono">{o.code}</p>
                                <p className="text-[10px] text-[var(--muted-foreground)] truncate">Customer: {o.customerName || 'Walk-in'}</p>
                              </div>
                              <span className="font-mono font-semibold">{parseFloat(o.total || 0).toFixed(2)} EGP</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        {/* Language Switcher */}
        <div className="flex border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--card)] p-0.5 h-9 shrink-0 select-none">
          <button
            onClick={() => handleLanguageChange('en')}
            className={cn(
              'px-2 rounded-md text-[10px] font-bold transition-all cursor-pointer',
              locale === 'en'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
            )}
          >
            ENG
          </button>
          <button
            onClick={() => handleLanguageChange('id')}
            className={cn(
              'px-2 rounded-md text-[10px] font-bold transition-all cursor-pointer',
              locale === 'id'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
            )}
          >
            IDN
          </button>
        </div>

        {/* Notifications Dropdown */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)] shrink-0 cursor-pointer"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {notifications.length > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
                </span>
              )}
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="w-80 rounded-xl border border-[var(--border)] bg-[var(--card)] p-2 shadow-2xl z-50 animate-scale-in text-xs"
              align="end"
              sideOffset={5}
            >
              <div className="flex items-center justify-between border-b border-[var(--border)]/40 pb-2 mb-2 px-2">
                <span className="font-bold text-[var(--foreground)]">Notifications</span>
                <span className="text-[10px] bg-brand-500/10 text-brand-500 px-1.5 py-0.5 rounded-full font-bold">
                  {notifications.length} Alerts
                </span>
              </div>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-[var(--muted-foreground)] text-xs">
                    No warning alerts.
                  </div>
                ) : (
                  notifications.map((item) => (
                    <DropdownMenu.Item
                      key={item.id}
                      onClick={() => router.push(item.href)}
                      className="flex items-start gap-2.5 rounded-lg p-2 hover:bg-[var(--accent)] text-[var(--foreground)] cursor-pointer outline-none transition-colors"
                    >
                      <AlertTriangle className="h-4 w-4 text-brand-500 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold">{item.title}</p>
                        <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{item.description}</p>
                      </div>
                    </DropdownMenu.Item>
                  ))
                )}
              </div>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {/* Profile / Logout Dropdown */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/10 border border-brand-500/20 text-xs font-bold text-brand-500 transition-colors hover:bg-brand-500/25 shrink-0 cursor-pointer">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'OW'}
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="w-56 rounded-xl border border-[var(--border)] bg-[var(--card)] p-2 shadow-2xl z-50 animate-scale-in text-xs"
              align="end"
              sideOffset={5}
            >
              <div className="flex flex-col border-b border-[var(--border)]/40 pb-2 mb-2 px-2">
                <span className="font-bold text-[var(--foreground)]">{user?.name || 'User Profile'}</span>
                <span className="text-[10px] text-[var(--muted-foreground)] font-semibold mt-0.5">Role: {user?.role?.name || 'OWNER'}</span>
              </div>
              
              <DropdownMenu.Item
                className="flex items-center gap-2 rounded-lg p-2 text-[var(--foreground)] hover:bg-[var(--accent)] cursor-pointer outline-none transition-colors"
                disabled
              >
                <Globe className="h-4 w-4 text-[var(--muted-foreground)]" />
                <span>{t.has('sidebar.language') ? t('sidebar.language') : (locale === 'id' ? 'Bahasa' : 'Language')}: {locale === 'en' ? 'English' : 'Indonesia'}</span>
              </DropdownMenu.Item>

              <DropdownMenu.Item
                className="flex items-center gap-2 rounded-lg p-2 text-[var(--foreground)] hover:bg-[var(--accent)] cursor-pointer outline-none transition-colors"
                disabled
              >
                <User className="h-4 w-4 text-[var(--muted-foreground)]" />
                <span>{user?.email || 'email@example.com'}</span>
              </DropdownMenu.Item>

              <DropdownMenu.Separator className="h-[1px] bg-[var(--border)]/40 my-1" />

              <DropdownMenu.Item
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-lg p-2 text-danger-500 hover:bg-danger-500/10 cursor-pointer outline-none transition-colors font-semibold"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
});

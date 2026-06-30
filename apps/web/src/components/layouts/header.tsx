'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Search, Bell, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/hooks/use-sidebar';

/** Generate breadcrumb segments from pathname */
function getBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  return segments.map((segment, index) => ({
    label: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
    href: '/' + segments.slice(0, index + 1).join('/'),
    isLast: index === segments.length - 1,
  }));
}

export function Header() {
  const pathname = usePathname();
  const { collapsed } = useSidebar();
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-16 items-center justify-between border-b px-6',
        'bg-[var(--header-bg)] backdrop-blur-xl border-[var(--border)]',
        'sidebar-transition',
        collapsed ? 'ml-[var(--sidebar-collapsed)]' : 'ml-[var(--sidebar-expanded)]',
      )}
    >
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
        {breadcrumbs.map((crumb) => (
          <div key={crumb.href} className="flex items-center gap-1">
            {!crumb.isLast && (
              <>
                <Link
                  href={crumb.href}
                  className="text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                >
                  {crumb.label}
                </Link>
                <ChevronRight className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
              </>
            )}
            {crumb.isLast && (
              <span className="font-medium text-[var(--foreground)]">{crumb.label}</span>
            )}
          </div>
        ))}
      </nav>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <button
          className={cn(
            'flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--secondary)] px-3',
            'text-sm text-[var(--muted-foreground)] transition-colors hover:border-[var(--muted-foreground)]',
          )}
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Search...</span>
          <kbd className="hidden rounded border border-[var(--border)] bg-[var(--background)] px-1.5 py-0.5 text-[10px] font-medium md:inline">
            ⌘K
          </kbd>
        </button>

        {/* Notifications */}
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
          </span>
        </button>

        {/* Profile */}
        <button className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/20 text-xs font-semibold text-brand-500 transition-colors hover:bg-brand-500/30">
          OW
        </button>
      </div>
    </header>
  );
}

import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const token = request.cookies.get('accessToken')?.value;

  // Extract locale from path
  const segments = pathname.split('/');
  const locale = ['en', 'id', 'ar'].includes(segments[1] || '') ? segments[1] : '';
  const pathWithoutLocale = locale ? '/' + segments.slice(2).join('/') : pathname;

  const isLoginPage = pathWithoutLocale === '/login';

  // Public paths that don't require authentication
  const isPublicPath =
    pathWithoutLocale.startsWith('/order');

  // Protected paths: everything inside dashboard and POS cashier screen
  const isProtectedPath =
    !isPublicPath && (
    pathWithoutLocale.startsWith('/dashboard') ||
    pathWithoutLocale.startsWith('/pos') ||
    pathWithoutLocale.startsWith('/products') ||
    pathWithoutLocale.startsWith('/categories') ||
    pathWithoutLocale.startsWith('/ingredients') ||
    pathWithoutLocale.startsWith('/units') ||
    pathWithoutLocale.startsWith('/settings') ||
    pathWithoutLocale.startsWith('/users') ||
    pathWithoutLocale.startsWith('/analytics') ||
    pathWithoutLocale.startsWith('/reports') ||
    pathWithoutLocale.startsWith('/inventory') ||
    pathWithoutLocale.startsWith('/kitchen') ||
    pathWithoutLocale.startsWith('/tables') ||
    pathWithoutLocale.startsWith('/variants') ||
    pathWithoutLocale.startsWith('/modifiers') ||
    pathWithoutLocale.startsWith('/orders'));

  const activeLocale = locale || 'en';

  if (!token && isProtectedPath) {
    // Redirect unauthenticated requests to login page
    const loginUrl = new URL(`/${activeLocale}/login`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (token) {
    let role = 'OWNER';
    try {
      const payloadSegment = token.split('.')[1];
      if (payloadSegment) {
        // Decode base64 URL safe payload
        const decoded = JSON.parse(atob(payloadSegment.replace(/-/g, '+').replace(/_/g, '/')));
        role = decoded.role || 'OWNER';
      }
    } catch {}

    if (isLoginPage) {
      let target = '/dashboard';
      if (role === 'CASHIER') {
        target = '/pos';
      } else if (role === 'KITCHEN') {
        target = '/kitchen';
      }
      const targetUrl = new URL(`/${activeLocale}${target}`, request.url);
      return NextResponse.redirect(targetUrl);
    }

    if (isProtectedPath) {
      if (role === 'KITCHEN' && pathWithoutLocale !== '/kitchen') {
        const targetUrl = new URL(`/${activeLocale}/kitchen`, request.url);
        return NextResponse.redirect(targetUrl);
      }
      if (role === 'CASHIER') {
        const blockedCashierPaths = [
          '/inventory',
          '/settings',
          '/users',
          '/reports',
          '/analytics',
          '/variants',
          '/modifiers',
          '/ingredients',
          '/units',
        ];
        const isBlocked = blockedCashierPaths.some(
          (blocked) => pathWithoutLocale === blocked || pathWithoutLocale.startsWith(blocked + '/')
        );
        if (isBlocked) {
          const targetUrl = new URL(`/${activeLocale}/pos`, request.url);
          return NextResponse.redirect(targetUrl);
        }
      }
    }
  }

  return intlMiddleware(request);
}

export const config = {
  // Match only internationalized pathnames
  matcher: [
    // Enable a redirect to a matching locale at the root
    '/',
    // Set locale prefix match
    '/(en|id|ar)/:path*',
    // Avoid running on api, static files, next internals, etc.
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};

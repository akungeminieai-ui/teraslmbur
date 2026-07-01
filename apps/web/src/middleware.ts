import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

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

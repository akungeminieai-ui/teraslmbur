/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  login: (authData: any) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const router = useRouter();
  const rawPathname = usePathname();
  const queryClient = useQueryClient();

  // Extract locale from pathname (e.g. /en/dashboard -> locale = en, path = /dashboard)
  const segments = rawPathname ? rawPathname.split('/') : [];
  const locale = ['en', 'id', 'ar'].includes(segments[1] || '') ? segments[1] : 'en';
  const path = '/' + segments.slice(2).join('/');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const accessToken = localStorage.getItem('accessToken');
    const profile = localStorage.getItem('userProfile');

    if (accessToken && profile) {
      // Instantly load cached profile — UI renders immediately
      try {
        const cached = JSON.parse(profile);
        setUser(cached);
      } catch {
        // Ignore parse error
      }
      setLoading(false);

      // Background-validate with /auth/me (non-blocking)
      apiClient.get<any>('/auth/me')
        .then((updatedProfile) => {
          setUser(updatedProfile);
          localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
          localStorage.setItem('userPermissions', JSON.stringify(updatedProfile.role.permissions));
        })
        .catch(() => {
          // Keep cached profile on network error
        });
    } else if (accessToken && !profile) {
      // Token exists but no cached profile — must wait for /auth/me
      apiClient.get<any>('/auth/me')
        .then((updatedProfile) => {
          setUser(updatedProfile);
          localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
          localStorage.setItem('userPermissions', JSON.stringify(updatedProfile.role.permissions));
        })
        .catch(() => {
          localStorage.clear();
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }

    // Listen for multi-tab logout and session expiration events
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'accessToken' && !e.newValue) {
        setUser(null);
        queryClient.clear();
        router.replace(`/${locale}/login`);
      }
    };

    const handleSessionExpired = () => {
      setIsSessionExpired(true);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth:session-expired', handleSessionExpired);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth:session-expired', handleSessionExpired);
    };
  }, [mounted, locale, router, queryClient]);

  // Client-side fallback route guard to guarantee no flicker and absolute security
  useEffect(() => {
    if (loading || !mounted) return;

    const accessToken = localStorage.getItem('accessToken');
    const isLoginPage = path === '/login';

    if (!accessToken && !isLoginPage) {
      router.replace(`/${locale}/login`);
    } else if (accessToken) {
      let roleName = user?.role?.name;
      if (!roleName) {
        const storedProfile = localStorage.getItem('userProfile');
        if (storedProfile) {
          try {
            const parsed = JSON.parse(storedProfile);
            roleName = parsed.role?.name;
          } catch {
            // Ignore
          }
        }
      }
      
      if (isLoginPage) {
        if (roleName === 'CASHIER') {
          router.replace(`/${locale}/pos`);
        } else if (roleName === 'KITCHEN') {
          router.replace(`/${locale}/kitchen`);
        } else {
          router.replace(`/${locale}/dashboard`);
        }
      } else {
        // Enforce role-based workspace routing
        const cashierAllowed = ['/dashboard', '/pos', '/orders', '/tables'];
        const kitchenAllowed = ['/dashboard', '/orders', '/kitchen', '/products', '/modifiers', '/units', '/ingredients', '/inventory'];

        if (roleName === 'CASHIER') {
          const isAllowed = cashierAllowed.some((allowed) => path === allowed || path.startsWith(allowed + '/'));
          if (!isAllowed) {
            router.replace(`/${locale}/pos`);
          }
        } else if (roleName === 'KITCHEN') {
          const isAllowed = kitchenAllowed.some((allowed) => path === allowed || path.startsWith(allowed + '/'));
          if (!isAllowed) {
            router.replace(`/${locale}/kitchen`);
          }
        }
      }
    }
  }, [user, loading, path, locale, router, mounted]);

  const login = (authData: any) => {
    localStorage.setItem('accessToken', authData.tokens.accessToken);
    localStorage.setItem('refreshToken', authData.tokens.refreshToken);
    localStorage.setItem('userPermissions', JSON.stringify(authData.user.role.permissions));
    localStorage.setItem('userProfile', JSON.stringify(authData.user));
    
    // Set cookie for Next.js Middleware route checks
    document.cookie = `accessToken=${authData.tokens.accessToken}; path=/; max-age=86400; SameSite=Lax`;

    setUser(authData.user);

    const roleName = authData.user.role?.name;
    if (roleName === 'CASHIER') {
      router.replace(`/${locale}/pos`);
    } else if (roleName === 'KITCHEN') {
      router.replace(`/${locale}/kitchen`);
    } else {
      router.replace(`/${locale}/dashboard`);
    }
  };

  const logout = async () => {
    try {
      // Notify backend to revoke refresh token
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore backend logout errors to ensure user can still clear their session locally
    }

    // Clear all auth/session related state
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userProfile');
    localStorage.removeItem('userPermissions');
    localStorage.removeItem('currentOutlet');
    localStorage.removeItem('currentShift');
    localStorage.removeItem('permissionCache');
    localStorage.removeItem('featureFlags');

    // Remove token cookie
    document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';

    setUser(null);
    queryClient.clear();
    router.replace(`/${locale}/login`);
  };

  const handleSessionExpiredRedirect = () => {
    setIsSessionExpired(false);
    // Clear tokens
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userProfile');
    localStorage.removeItem('userPermissions');
    document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    setUser(null);
    queryClient.clear();
    router.replace(`/${locale}/login`);
  };

  if (!mounted) {
    return null;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {loading ? (
        // Beautiful Premium Splash Screen
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-[var(--background)]">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-glow animate-pulse">
              <span className="text-2xl font-bold">TL</span>
            </div>
            <h2 className="text-lg font-medium text-[var(--foreground)] tracking-wide">
              Loading Teras Lmbur OS...
            </h2>
            <div className="h-1 w-24 overflow-hidden rounded-full bg-[var(--border)]">
              <div className="h-full w-1/2 animate-loading-bar rounded-full bg-brand-500" />
            </div>
          </div>
        </div>
      ) : (
        <>
          {children}
          {/* Professional Session Expired Backdrop Modal */}
          {isSessionExpired && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <h3 className="text-lg font-semibold text-[var(--foreground)]">Session Expired</h3>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  Your security session has expired. Please log in again to continue.
                </p>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSessionExpiredRedirect}
                    className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition-colors shadow-glow"
                  >
                    Log In
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

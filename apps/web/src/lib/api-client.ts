/* eslint-disable @typescript-eslint/no-explicit-any */
import { siteConfig } from '@/config/site';

export class ApiClientError extends Error {
  statusCode: number;
  errors?: Record<string, string[]>;

  constructor(message: string, statusCode: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

// Token refresh synchronization queue
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  isRefreshRequest = false
): Promise<T> {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem(isRefreshRequest ? 'refreshToken' : 'accessToken')
    : null;
  const locale = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] || 'en' : 'en';
  
  const headers = new Headers(options.headers);
  const isMultipart = options.body instanceof FormData;
  if (!isMultipart) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  headers.set('accept-language', locale);
  headers.set('x-timezone', Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Cairo');

  const config: RequestInit = {
    ...options,
    headers,
  };

  const url = `${siteConfig.apiUrl}/api/v1${path}`;
  const response = await fetch(url, config);

  if (response.status === 204) {
    return {} as T;
  }

  // Handle unauthorized responses (401)
  if (response.status === 401 && !isRefreshRequest && typeof window !== 'undefined') {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      if (!isRefreshing) {
        isRefreshing = true;
        
        // Asynchronously call the refresh token endpoint
        fetch(`${siteConfig.apiUrl}/api/v1/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${refreshToken}`,
          },
        })
          .then(async (refreshRes) => {
            if (refreshRes.ok) {
              const refreshJson = await refreshRes.ok ? await refreshRes.json() : null;
              const newTokens = refreshJson?.data;
              if (newTokens?.accessToken) {
                localStorage.setItem('accessToken', newTokens.accessToken);
                localStorage.setItem('refreshToken', newTokens.refreshToken);
                
                // Synchronize cookie for server-side middleware checks
                document.cookie = `accessToken=${newTokens.accessToken}; path=/; max-age=86400; SameSite=Lax`;
                
                isRefreshing = false;
                onRefreshed(newTokens.accessToken);
              } else {
                throw new Error('Invalid refresh token response');
              }
            } else {
              throw new Error('Refresh endpoint rejected token');
            }
          })
          .catch(() => {
            isRefreshing = false;
            // Purge credentials and raise session expired modal trigger event
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('userProfile');
            localStorage.removeItem('userPermissions');
            document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            window.dispatchEvent(new CustomEvent('auth:session-expired'));
          });
      }

      // Return a promise that resolves with the original request once refreshed
      return new Promise<T>((resolve, reject) => {
        subscribeTokenRefresh((newToken) => {
          headers.set('Authorization', `Bearer ${newToken}`);
          fetch(url, { ...options, headers })
            .then(async (res) => {
              if (res.status === 204) return resolve({} as T);
              const resJson = await res.json();
              if (res.ok) {
                resolve(resJson.data as T);
              } else {
                reject(new ApiClientError(resJson.message, res.status, resJson.errors));
              }
            })
            .catch(reject);
        });
      });
    } else {
      // No refresh token available, dispatch expired event directly
      localStorage.removeItem('accessToken');
      localStorage.removeItem('userProfile');
      localStorage.removeItem('userPermissions');
      document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      window.dispatchEvent(new CustomEvent('auth:session-expired'));
    }
  }

  const json = await response.json();

  if (!response.ok) {
    throw new ApiClientError(
      json.message || 'An error occurred while communicating with the API',
      response.status,
      json.errors
    );
  }

  // Unwrap the standard success envelope { success: true, data: T }
  return json.data as T;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { ...options, method: 'GET' }),
    
  post: <T>(path: string, body?: any, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    }),
    
  put: <T>(path: string, body?: any, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    }),

  patch: <T>(path: string, body?: any, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    }),
    
  delete: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};

/* eslint-disable @typescript-eslint/no-explicit-any */
import { siteConfig } from '@/config/site';

/**
 * Lightweight API client for public endpoints (no JWT auth required).
 * Used by the customer-facing self-order page.
 */
async function publicRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  const isMultipart = options.body instanceof FormData;
  if (!isMultipart) {
    headers.set('Content-Type', 'application/json');
  }

  const locale = typeof window !== 'undefined' ? window.location.pathname.split('/')[1] || 'id' : 'id';
  headers.set('accept-language', locale);

  const config: RequestInit = {
    ...options,
    headers,
  };

  const url = `${siteConfig.apiUrl}/api/v1${path}`;
  const response = await fetch(url, config);

  if (response.status === 204) {
    return {} as T;
  }

  const json = await response.json();

  if (!response.ok) {
    throw new Error(json.message || 'An error occurred');
  }

  return json.data as T;
}

export const apiPublic = {
  get: <T>(path: string) => publicRequest<T>(path, { method: 'GET' }),

  post: <T>(path: string, body?: any) =>
    publicRequest<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),
};

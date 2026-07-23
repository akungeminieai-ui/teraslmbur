
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import type { AbstractIntlMessages } from 'next-intl';

export default getRequestConfig(async ({ requestLocale }) => {
  // Try to resolve the locale parameter, fallback to default
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as 'en' | 'id' | 'ar')) {
    locale = routing.defaultLocale;
  }

  // Load and merge translation JSON files for the selected locale
  const files = [
    'common',
    'pos',
    'dashboard',
    'products',
    'orders',
    'kitchen',
    'inventory',
    'reports',
    'analytics',
    'settings',
    'finance',
    'customers',
    'errors',
    'validation',
    'units',
    'categories',
    'variants',
    'modifiers',
    'ingredients',
    'selfOrder',
  ];

  const messages: Record<string, unknown> = {};

  for (const file of files) {
    try {
      // Import the dynamic file content
      const content = await import(`../../messages/${locale}/${file}.json`);
      messages[file] = content.default;
    } catch {
      // Fallback for missing/empty language file structure
      messages[file] = {};
    }
  }

  return {
    locale,
    messages: messages as unknown as AbstractIntlMessages,
  };
});

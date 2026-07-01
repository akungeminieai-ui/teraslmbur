import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  // Try to resolve the locale parameter, fallback to default
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  // Load and merge translation JSON files for the selected locale
  const files = [
    'common',
    'dashboard',
    'products',
    'orders',
    'kitchen',
    'inventory',
    'reports',
    'settings',
    'finance',
    'customers',
    'errors',
    'validation',
  ];

  const messages: Record<string, any> = {};

  for (const file of files) {
    try {
      // Import the dynamic file content
      const content = await import(`../../messages/${locale}/${file}.json`);
      messages[file] = content.default;
    } catch (e) {
      // Fallback for missing/empty language file structure
      messages[file] = {};
    }
  }

  return {
    locale,
    messages,
  };
});

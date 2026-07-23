/**
 * ============================================================
 * Enterprise Frontend ROS Services — Teras Lmbur OS
 * ============================================================
 */

import { useTranslations } from 'next-intl';

/**
 * 1. TranslationService Helper
 * Wraps translation hooks for simple catalog key resolution.
 */
export function useTranslationService() {
  const t = useTranslations();
  return {
    t,
    translateEntity: <T extends { name?: string; translations?: Array<{ locale: string; name: string; description?: string | null }> }>(
      entity: T,
      locale: string,
    ): T & { displayName: string; displayDescription?: string } => {
      if (!entity.translations || entity.translations.length === 0) {
        return { ...entity, displayName: entity.name || 'Untranslated' };
      }
      const matched =
        entity.translations.find((t) => t.locale === locale) ||
        entity.translations.find((t) => t.locale === 'en') ||
        entity.translations.find((t) => t.locale === 'id') ||
        entity.translations[0];

      return {
        ...entity,
        displayName: matched.name,
        displayDescription: matched.description || undefined,
      };
    },
  };
}

/**
 * 2. Theme Token Service
 * Injects token variables into target HTML DOM styles.
 */
export class ThemeService {
  static getCSSVariables(tokens: Record<string, string>): Record<string, string> {
    const vars: Record<string, string> = {};
    for (const [token, value] of Object.entries(tokens)) {
      // Map tokens like 'brand.primary' to CSS variables like '--brand-primary'
      const cssVar = `--${token.replace(/\./g, '-')}`;
      vars[cssVar] = value;
    }
    return vars;
  }
}

/**
 * 3. Branding & Settings Client Resolvers
 */
export class SettingsService {
  /**
   * Safe value resolver with default fallback configuration.
   */
  static get(settings: Record<string, string>, key: string, defaultValue = ''): string {
    return settings[key] !== undefined ? settings[key] : defaultValue;
  }
}

export class BrandingService {
  static getLogo(settings: Record<string, string>): string {
    return SettingsService.get(settings, 'brand_logo', '/logo.png');
  }

  static getBrandName(settings: Record<string, string>): string {
    return SettingsService.get(settings, 'brand_name', 'Teras Lmbur');
  }
}

/**
 * 4. Locale-Aware Currency Formatter
 */
export class CurrencyFormatter {
  /**
   * Formats decimal strings into localized currency notation (EGP, IDR, etc.).
   */
  static format(amount: number | string, currency = 'EGP', locale = 'en-US'): string {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(num)) return '';

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }
}

/**
 * 5. Locale-Aware Date Formatter
 */
export class DateFormatter {
  /**
   * Formats dates according to selected locale options.
   */
  static format(date: Date | string | number, locale = 'en-US', includeTime = true): string {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: includeTime ? 'short' : undefined,
    }).format(d);
  }
}

import type { CurrencyCode } from '@teras-lmbur/types';

export const DEFAULT_CURRENCY: CurrencyCode = 'EGP';

const CURRENCY_CONFIG: Record<string, { locale: string; symbol: string; decimals: number }> = {
  EGP: { locale: 'ar-EG', symbol: 'EGP', decimals: 2 },
  USD: { locale: 'en-US', symbol: '$', decimals: 2 },
  EUR: { locale: 'de-DE', symbol: '€', decimals: 2 },
  SAR: { locale: 'ar-SA', symbol: 'SAR', decimals: 2 },
};

/**
 * Format a Decimal string as a localized currency string.
 * Uses Intl.NumberFormat for proper locale-aware formatting.
 *
 * @param amount - Decimal string (e.g., "18250.00")
 * @param currency - Currency code (default: EGP)
 * @returns Formatted string (e.g., "18,250 EGP")
 */
export function formatMoney(amount: string | number, currency: CurrencyCode = DEFAULT_CURRENCY): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numericAmount)) {
    return `0 ${currency}`;
  }

  const config = CURRENCY_CONFIG[currency];

  if (config) {
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: config.decimals,
      maximumFractionDigits: config.decimals,
    }).format(numericAmount);
  }

  // Fallback for unknown currencies
  return `${numericAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

/**
 * Parse a formatted money string back to a numeric string.
 * Strips all non-numeric characters except decimal point and minus.
 */
export function parseMoney(formatted: string): string {
  const cleaned = formatted.replace(/[^\d.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? '0.00' : num.toFixed(2);
}

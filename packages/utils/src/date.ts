/**
 * Format a date string or Date object to a localized string.
 */
export function formatDate(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  });
}

/**
 * Format a date as a relative time string (e.g., "2 hours ago").
 */
export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return formatDate(d);
}

/**
 * Check if a date is today.
 */
export function isToday(date: string | Date): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

/**
 * Format time only (e.g., "14:30").
 */
export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

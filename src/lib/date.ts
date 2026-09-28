/**
 * Centralized Date Formatting Utilities for Zeinity Creator Assistant
 * Standardized locale: id-ID
 */

/**
 * Format an ISO date string into human-friendly Indonesian text.
 * When `formatFull` is false (default):
 * - < 1 hour: 'Baru saja'
 * - < 24 hours: 'Hari ini, HH:mm'
 * - < 48 hours: 'Kemarin'
 * - Else: 'd MMM' (e.g., '28 Sep') or 'd MMM yyyy'
 *
 * When `formatFull` is true:
 * - Full date with year (e.g., '28 Sep 2026')
 */
export function formatDate(iso: string | null | undefined, formatFull: boolean = false): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';

  if (formatFull) {
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();

  // If in the future (e.g. clock skew), format as date with year if not current year
  if (diffMs < 0) {
    const isCurrentYear = d.getFullYear() === now.getFullYear();
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: isCurrentYear ? undefined : 'numeric',
    });
  }

  // Same calendar day check
  const isSameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (isSameDay) {
    const diffH = Math.floor(diffMs / 3600000);
    if (diffH < 1) return 'Baru saja';
    return `Hari ini, ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
  }

  // Yesterday check (1 calendar day ago)
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return 'Kemarin';
  }

  const isCurrentYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: isCurrentYear ? undefined : 'numeric',
  });
}

/**
 * Format ISO date string into complete full date (e.g. '28 Sep 2026').
 */
export function formatFullDate(iso: string | null | undefined): string {
  return formatDate(iso, true);
}


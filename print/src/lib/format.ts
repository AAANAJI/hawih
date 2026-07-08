/**
 * format.ts — locale-aware formatting helpers.
 * Prices are always rendered LTR-grouped so Arabic layout never reverses
 * digits. Wrap the OUTPUT of formatSAR in a <bdi> at the call site.
 */

export type Locale = 'ar' | 'en';

const SAR_AR = 'ر.س';
const SAR_EN = 'SAR';

/**
 * Format a number as a Saudi Riyal price string.
 * ar -> "١٤٩ ر.س"   en -> "SAR 149"
 * The numerals stay grouped LTR; render inside <bdi>.
 */
export function formatSAR(amount: number, locale: Locale = 'ar'): string {
  const n = Number.isFinite(amount) ? amount : 0;
  if (locale === 'ar') {
    const digits = new Intl.NumberFormat('ar-SA', {
      maximumFractionDigits: 0,
    }).format(n);
    return `${digits} ${SAR_AR}`;
  }
  const digits = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(n);
  return `${SAR_EN} ${digits}`;
}

/** Plain number in the locale's numerals (no currency). */
export function formatNumber(n: number, locale: Locale = 'ar'): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    maximumFractionDigits: 0,
  }).format(n);
}

/** Format an ISO date to a readable localized date. */
export function arabicDate(iso: string, locale: Locale = 'ar'): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

/** Human-readable file size, always LTR (e.g. "2.4 MB"). */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

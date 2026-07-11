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
  // Show the real price: up to 2 decimals (9.6 → "9.6", 9.65 → "9.65"), but no
  // trailing ".00" on whole riyals (149 → "149"). Never round to whole riyals.
  if (locale === 'ar') {
    const digits = new Intl.NumberFormat('ar-SA', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n);
    return `${digits} ${SAR_AR}`;
  }
  const digits = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
  return `${SAR_EN} ${digits}`;
}

/** Plain number in the locale's numerals (no currency). */
export function formatNumber(n: number, locale: Locale = 'ar'): string {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    maximumFractionDigits: 0,
  }).format(n);
}

/** Shape of the store price config as it rides the catalog payload. */
export interface PriceModeConfig {
  price_mode: 'exact' | 'range';
  range_low_pct: number;
  range_high_pct: number;
}

/**
 * Per-ITEM price config (spec 013 R-9): an item's own resolved mode
 * ('exact' | 'range') overrides the store-wide mode; anything else ('' from
 * older snapshots) inherits. Pass the result to formatPrice/formatCardPrice/
 * priceRangeBounds so every surface stays on the one formatter.
 */
export function itemPriceCfg(
  cfg: PriceModeConfig | undefined,
  itemMode?: string,
): PriceModeConfig | undefined {
  if (!cfg) return cfg;
  if (itemMode === 'range' || itemMode === 'exact') return { ...cfg, price_mode: itemMode };
  return cfg;
}

/** The low/high bounds of an estimated price under range mode. */
export function priceRangeBounds(rate: number, cfg: PriceModeConfig): { low: number; high: number } {
  const r = Number.isFinite(rate) ? rate : 0;
  // Keep 2dp precision on the band bounds (don't round to whole riyals).
  const round2 = (x: number) => Math.round(x * 100) / 100;
  const low = Math.max(0, round2(r * (1 - (Number(cfg.range_low_pct) || 0) / 100)));
  const high = round2(r * (1 + (Number(cfg.range_high_pct) || 0) / 100));
  return { low, high: Math.max(high, low) };
}

/**
 * Render an explicit low–high band, e.g. ar → "٩٥–١٣٥ ر.س", en → "SAR 95–135".
 * Collapses to a plain price when the bounds meet. Bounds keep up to 2
 * decimals — never rounded to whole riyals.
 */
export function formatBand(low: number, high: number, locale: Locale = 'ar'): string {
  if (low === high) return formatSAR(low, locale);
  const nf = new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return locale === 'ar'
    ? `${nf.format(low)}–${nf.format(high)} ${SAR_AR}`
    : `${SAR_EN} ${nf.format(low)}–${nf.format(high)}`;
}

/**
 * THE single price formatter for every surface (PriceBox, cards, cart,
 * checkout, and both live-sync mirrors). In 'exact' mode it's formatSAR; in
 * 'range' mode it renders the estimate band via formatBand().
 */
export function formatPrice(rate: number, cfg: PriceModeConfig | undefined, locale: Locale = 'ar'): string {
  if (!cfg || cfg.price_mode !== 'range') return formatSAR(rate, locale);
  const { low, high } = priceRangeBounds(rate, cfg);
  return formatBand(low, high, locale);
}

/**
 * Product-CARD price. Cards already say "starting from", so under range mode
 * they show just the LOW bound (clean, sortable, honest); exact mode = rate.
 * Mirrored by the live-sync card renderers — keep the rule identical.
 */
export function formatCardPrice(rate: number, cfg: PriceModeConfig | undefined, locale: Locale = 'ar'): string {
  if (!cfg || cfg.price_mode !== 'range') return formatSAR(rate, locale);
  return formatSAR(priceRangeBounds(rate, cfg).low, locale);
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

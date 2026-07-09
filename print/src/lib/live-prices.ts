/**
 * live-prices.ts — BROWSER-side price/image hydration.
 *
 * The static HTML ships with the last-built prices/images (good for SEO and
 * instant first paint); this refreshes the visible numbers/images a moment
 * later from the live CRM. If the API is unreachable, the baked values stand.
 *
 * The actual fetch + cache now lives in live-catalog.ts (single source); this
 * module keeps its long-standing API (hydrateCardPrices, liveItem) so callers
 * (Base.astro, product page) are unchanged.
 *
 * Cards: any element marked [data-live-price] inside a product link has its
 * text replaced with the live "from" price (slug derived from the link).
 * Product page: the buy box reads the live base rate + option deltas via
 * liveItem() (see product/[slug].astro).
 */
import { rawItemsBySlug, type RawItem } from './live-catalog';
import { formatSAR, type Locale } from './format';

export type LiveItem = RawItem;

/** Look up one live (raw) item by slug (null if the API had nothing for it). */
export async function liveItem(slug: string): Promise<LiveItem | null> {
  const map = await rawItemsBySlug();
  return map.get(slug) ?? null;
}

function currentLocale(): Locale {
  return typeof document !== 'undefined' && document.documentElement.lang === 'en' ? 'en' : 'ar';
}

function slugFromLink(a: HTMLAnchorElement | null): string | null {
  if (!a) return null;
  const href = a.getAttribute('href') || '';
  const m = href.split('/product/')[1];
  if (!m) return null;
  return m.replace(/[/#?].*$/, '').replace(/\/$/, '');
}

/**
 * Refresh every [data-live-price] card price on the current page from the
 * live catalog. Safe to call on any page — no-ops when there are no cards or
 * the API is unreachable.
 */
export async function hydrateCardPrices(): Promise<void> {
  if (typeof document === 'undefined') return;
  const priceEls = Array.from(document.querySelectorAll<HTMLElement>('[data-live-price]'));
  const imgEls = Array.from(document.querySelectorAll<HTMLImageElement>('[data-live-image]'));
  if (!priceEls.length && !imgEls.length) return;
  const map = await rawItemsBySlug();
  if (!map.size) return;
  const locale = currentLocale();

  for (const el of priceEls) {
    const slug = el.dataset.slug || slugFromLink(el.closest('a'));
    if (!slug) continue;
    const it = map.get(slug);
    if (it && Number.isFinite(Number(it.rate))) {
      el.textContent = formatSAR(Number(it.rate), locale);
    }
  }

  // Refresh card images from the CRM-managed image (when the item has one).
  for (const img of imgEls) {
    const slug = img.dataset.slug || slugFromLink(img.closest('a'));
    if (!slug) continue;
    const it = map.get(slug);
    if (it && it.image) img.src = String(it.image);
  }
}

/**
 * live-prices.ts — BROWSER-side. Keeps displayed catalog prices in sync with
 * the CRM without a rebuild: on page load we fetch the live catalog once
 * (session-cached, short TTL) and overwrite the build-time "baked" prices.
 *
 * The static HTML still ships with the last-built prices (good for SEO and
 * instant first paint); this just refreshes the visible numbers a moment
 * later. If the API is unreachable, the baked prices simply stand.
 *
 * Cards: any element marked [data-live-price] inside a product link has its
 * text replaced with the live "from" price (slug is derived from the link).
 * Product page: the buy box reads the live base rate + option deltas via
 * liveItem() and recomputes (see product/[slug].astro).
 */
import { API_BASE } from './config';
import { formatSAR, type Locale } from './format';

export interface LiveOptionValueTier {
  label: string;
  price_delta: number;
}
export interface LiveOption {
  name_ar: string;
  name_en?: string;
  type: string;
  values: Array<string | LiveOptionValueTier>;
}
export interface LiveItem {
  id: number | string;
  slug: string;
  rate: number;
  currency?: string;
  options?: LiveOption[];
}

const SS_KEY = 'hawih_live_catalog';
const TTL_MS = 90_000;

let inflight: Promise<Map<string, LiveItem>> | null = null;

function fromCache(): Map<string, LiveItem> | null {
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { t: number; items: LiveItem[] };
    if (!parsed || !Array.isArray(parsed.items)) return null;
    if (Date.now() - parsed.t > TTL_MS) return null;
    return indexBySlug(parsed.items);
  } catch {
    return null;
  }
}

function indexBySlug(items: LiveItem[]): Map<string, LiveItem> {
  const m = new Map<string, LiveItem>();
  for (const it of items) {
    if (it && it.slug != null) m.set(String(it.slug), it);
  }
  return m;
}

/** Fetch (or reuse) the live catalog as a slug→item map. Never throws. */
export function liveCatalog(): Promise<Map<string, LiveItem>> {
  if (inflight) return inflight;
  const cached = fromCache();
  if (cached) {
    inflight = Promise.resolve(cached);
    return inflight;
  }
  inflight = (async () => {
    try {
      const res = await fetch(API_BASE + 'catalog', { headers: { Accept: 'application/json' } });
      if (!res.ok) return new Map<string, LiveItem>();
      const data = (await res.json()) as { success?: boolean; items?: LiveItem[] };
      if (!data || data.success !== true || !Array.isArray(data.items)) {
        return new Map<string, LiveItem>();
      }
      try {
        sessionStorage.setItem(SS_KEY, JSON.stringify({ t: Date.now(), items: data.items }));
      } catch {
        /* storage full/blocked — ignore */
      }
      return indexBySlug(data.items);
    } catch {
      return new Map<string, LiveItem>(); // offline / CORS / blocked → keep baked
    }
  })();
  return inflight;
}

/** Look up one live item by slug (null if the API had nothing for it). */
export async function liveItem(slug: string): Promise<LiveItem | null> {
  const map = await liveCatalog();
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
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-live-price]'));
  if (!els.length) return;
  const map = await liveCatalog();
  if (!map.size) return;
  const locale = currentLocale();
  for (const el of els) {
    const slug = el.dataset.slug || slugFromLink(el.closest('a'));
    if (!slug) continue;
    const it = map.get(slug);
    if (it && Number.isFinite(Number(it.rate))) {
      el.textContent = formatSAR(Number(it.rate), locale);
    }
  }
}

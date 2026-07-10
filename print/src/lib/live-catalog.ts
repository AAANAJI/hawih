/**
 * live-catalog.ts — BROWSER-side. The single source of the live CRM catalog.
 *
 * Fetches `print_api/catalog` once per page (session-cached, short TTL) and
 * exposes it two ways:
 *   - liveCatalog()      → the FULL transformed catalog ({categories, items})
 *                          in the exact shape of catalog.json, via the SAME
 *                          transform the build uses (catalog-transform.mjs).
 *                          Used by catalog-sync.ts to re-render pages live.
 *   - rawItemsBySlug()   → slug → raw API item (rate/image/options as returned),
 *                          used by live-prices.ts for price/image hydration.
 *
 * Never throws: on any network/CORS/parse failure it resolves to null / an
 * empty map, so the baked HTML simply stands (offline-safe, SEO-safe).
 */
import { API_BASE } from './config';
import { transformCatalog } from './catalog-transform.mjs';
import { storeConfig as bakedStoreConfig } from './catalog';
import type { Catalog, CatalogItem, StoreConfig } from './catalog';

export interface RawItem {
  id: number | string;
  slug: string;
  category_slug?: string;
  rate?: number;
  currency?: string;
  image?: string;
  options?: unknown[];
  [k: string]: unknown;
}
interface RawApi {
  success?: boolean;
  store_config?: { price_mode?: string; range_low_pct?: number; range_high_pct?: number };
  categories?: unknown[];
  items?: RawItem[];
}

const SS_KEY = 'hawih_catalog_raw';
const TTL_MS = 90_000;

let inflight: Promise<RawApi | null> | null = null;

function fromCache(): RawApi | null {
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { t: number; data: RawApi };
    if (!parsed || !parsed.data || !Array.isArray(parsed.data.items)) return null;
    if (Date.now() - parsed.t > TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

/** Fetch (or reuse) the raw live catalog response. Never throws. */
export function rawCatalog(): Promise<RawApi | null> {
  if (inflight) return inflight;
  const cached = fromCache();
  if (cached) {
    inflight = Promise.resolve(cached);
    return inflight;
  }
  inflight = (async () => {
    try {
      const res = await fetch(API_BASE + 'catalog', { headers: { Accept: 'application/json' } });
      if (!res.ok) return null;
      const data = (await res.json()) as RawApi;
      if (!data || data.success !== true || !Array.isArray(data.items)) return null;
      try {
        sessionStorage.setItem(SS_KEY, JSON.stringify({ t: Date.now(), data }));
      } catch {
        /* storage full/blocked — ignore */
      }
      return data;
    } catch {
      return null; // offline / CORS / blocked → keep baked
    }
  })();
  return inflight;
}

/** The live catalog transformed to the frontend shape (null if unavailable). */
export async function liveCatalog(): Promise<Catalog | null> {
  const raw = await rawCatalog();
  if (!raw) return null;
  try {
    const { catalog, itemCount } = transformCatalog(raw) as { catalog: Catalog; itemCount: number };
    return itemCount > 0 ? catalog : null;
  } catch {
    return null;
  }
}

/**
 * The LIVE store config (price mode + range bounds), falling back to the
 * baked snapshot when the API is unreachable. This is what lets flipping the
 * CRM setting change the storefront pricing display with no redeploy.
 */
export async function liveStoreConfig(): Promise<StoreConfig> {
  const raw = await rawCatalog();
  const sc = raw && raw.store_config && typeof raw.store_config === 'object' ? raw.store_config : null;
  if (!sc) return bakedStoreConfig;
  return {
    price_mode: sc.price_mode === 'range' ? 'range' : 'exact',
    range_low_pct: Number(sc.range_low_pct) || 0,
    range_high_pct: Number(sc.range_high_pct) || 0,
  };
}

/** slug → raw API item, for price/image hydration. Empty map if unavailable. */
export async function rawItemsBySlug(): Promise<Map<string, RawItem>> {
  const raw = await rawCatalog();
  const m = new Map<string, RawItem>();
  if (raw && Array.isArray(raw.items)) {
    for (const it of raw.items) {
      if (it && it.slug != null) m.set(String(it.slug), it);
    }
  }
  return m;
}

/** One live item (transformed) by slug — used where the frontend shape helps. */
export async function liveItemTransformed(slug: string): Promise<CatalogItem | null> {
  const cat = await liveCatalog();
  if (!cat) return null;
  return cat.items.find((i) => i.slug === slug) ?? null;
}

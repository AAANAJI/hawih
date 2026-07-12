/**
 * catalog.ts — typed access to the committed catalog snapshot.
 * Build-time helper (imported by .astro pages). The shape mirrors the
 * live API 'catalog' response exactly (see API CONTRACT).
 */
import raw from '../data/catalog.json';
import type { Locale } from './format';

export interface OptionValue {
  label_ar: string;
  label_en: string;
  price_delta: number;
  /** Optional curated extras from the CRM print_options JSON. */
  recommended?: boolean;
  sublabel_ar?: string;
  sublabel_en?: string;
  icon?: string;
}
export interface CatalogOption {
  name_ar: string;
  name_en: string;
  type: 'select' | 'tier';
  values: OptionValue[];
}
export interface CatalogCategory {
  id: number | string;
  slug: string;
  title: string;
  title_en: string;
  sort: number;
  /** Provenance tag (e.g. 'helloprint' design-QA); absent for real categories. */
  tag?: string;
}
export interface CatalogItem {
  id: number | string;
  slug: string;
  category_slug: string;
  title: string;
  title_en: string;
  description: string;
  description_en: string;
  rate: number;
  currency: string;
  unit_type: string;
  unit_type_en?: string;
  min_qty?: number;
  requires_artwork: boolean;
  /**
   * Per-product price lane, resolved server-side ('exact' | 'range');
   * '' / absent (older snapshots) inherits the store-wide price_mode.
   */
  price_mode?: string;
  images?: { hero: string; square: string };
  options: CatalogOption[];
  /**
   * Provenance tag. 'helloprint' marks the design-QA catalog imported for
   * head-to-head comparison — kept OUT of the real storefront listings and
   * shown only under the ?qa=helloprint toggle. Absent for real products.
   */
  tag?: string;
}
/** The design-QA tag (see CatalogItem.tag). */
export const QA_TAG = 'helloprint';
/**
 * Store-wide config that rides the catalog payload (CRM settings-driven).
 * price_mode 'range' = vendor-quote mode: prices render as a low–high range
 * ("final price confirmed after review") and no invoice is issued at checkout.
 */
export interface StoreConfig {
  price_mode: 'exact' | 'range';
  range_low_pct: number;
  range_high_pct: number;
}
export interface Catalog {
  success: boolean;
  store_config?: StoreConfig;
  categories: CatalogCategory[];
  items: CatalogItem[];
}

const catalog = raw as Catalog;

/** Baked store config (live pages re-read it from the live catalog). */
export const storeConfig: StoreConfig = catalog.store_config ?? {
  price_mode: 'exact',
  range_low_pct: 0,
  range_high_pct: 0,
};

// ALL baked categories/items — used for static path generation and lookups so
// design-QA product/category pages exist and resolve (navigable behind the
// ?qa toggle). Listings use displayCategories/displayItems below.
export const categories: CatalogCategory[] = [...catalog.categories].sort(
  (a, b) => a.sort - b.sort,
);
export const items: CatalogItem[] = catalog.items;

/** True for the design-QA (HelloPrint) catalog rows. */
export const isQaItem = (i: CatalogItem): boolean => i.tag === QA_TAG;
export const isQaCategory = (c: CatalogCategory): boolean => c.tag === QA_TAG;

// Storefront listing view. During the design phase the HelloPrint clone IS the
// catalog, so these show everything (the clone). To go back to a mixed catalog
// where the tagged design set is hidden from the real store, restore the filter:
//   .filter((c) => !isQaCategory(c)) / .filter((i) => !isQaItem(i))
export const displayCategories: CatalogCategory[] = categories;
export const displayItems: CatalogItem[] = items;

export function getCategory(slug: string): CatalogCategory | undefined {
  return categories.find((c) => c.slug === slug);
}
export function getItem(slug: string): CatalogItem | undefined {
  return items.find((i) => i.slug === slug);
}
export function itemsInCategory(slug: string): CatalogItem[] {
  return items.filter((i) => i.category_slug === slug);
}
export function relatedItems(item: CatalogItem, limit = 3): CatalogItem[] {
  return items
    .filter((i) => i.category_slug === item.category_slug && i.slug !== item.slug)
    .slice(0, limit);
}

/** Localized category / item titles. */
export function categoryTitle(c: CatalogCategory, locale: Locale): string {
  return locale === 'ar' ? c.title : c.title_en;
}
export function itemTitle(i: CatalogItem, locale: Locale): string {
  return locale === 'ar' ? i.title : i.title_en;
}
export function itemDescription(i: CatalogItem, locale: Locale): string {
  return locale === 'ar' ? i.description : i.description_en;
}
export function optionName(o: CatalogOption, locale: Locale): string {
  return locale === 'ar' ? o.name_ar || o.name_en : o.name_en || o.name_ar;
}
/** Localized label for an option value (falls back across locales). */
export function valueLabel(v: OptionValue, locale: Locale): string {
  return locale === 'ar' ? v.label_ar || v.label_en : v.label_en || v.label_ar;
}

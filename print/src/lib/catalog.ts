/**
 * catalog.ts — typed access to the committed catalog snapshot.
 * Build-time helper (imported by .astro pages). The shape mirrors the
 * live API 'catalog' response exactly (see API CONTRACT).
 */
import raw from '../data/catalog.json';
import type { Locale } from './format';

export interface OptionValueTier {
  label: string;
  price_delta: number;
}
export interface CatalogOption {
  name_ar: string;
  name_en: string;
  type: 'select' | 'tier';
  values: string[] | OptionValueTier[];
}
export interface CatalogCategory {
  id: string;
  slug: string;
  title: string;
  title_en: string;
  sort: number;
}
export interface CatalogItem {
  id: string;
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
  images?: { hero: string; square: string };
  options: CatalogOption[];
}
export interface Catalog {
  success: boolean;
  categories: CatalogCategory[];
  items: CatalogItem[];
}

const catalog = raw as Catalog;

export const categories: CatalogCategory[] = [...catalog.categories].sort(
  (a, b) => a.sort - b.sort,
);
export const items: CatalogItem[] = catalog.items;

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
  return locale === 'ar' ? o.name_ar : o.name_en;
}

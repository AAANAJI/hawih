#!/usr/bin/env node
/**
 * build-catalog.mjs
 * Transforms the live print API `catalog` response into the store's catalog
 * snapshot (src/data/catalog.json). The CRM is the source of truth for
 * products, options, names, images and prices; this build-time step turns the
 * API shape into the frontend shape:
 *   - Category slug + English name: the CRM has no slug/EN field for categories,
 *     so we map the known Arabic titles to semantic slugs + English names
 *     (CAT_MAP), falling back to a slugified title. Only categories that have at
 *     least one product are kept (drops the stock "General item").
 *   - Item image: uses the CRM-uploaded image URL when present, else the curated
 *     SVG placeholder under /img/products/<slug>/.
 *   - Options: normalized to {name_ar,name_en,type,values:[{label_ar,label_en,price_delta}]}.
 *
 * On ANY failure (network, non-200, malformed JSON) the committed snapshot is
 * left untouched and the process exits 0 — the build never fails because the
 * backend is unreachable. Runtime freshness is additionally handled in the
 * browser by src/lib/live-prices.ts.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../src/data/catalog.json');
const API = 'https://crm.hawih.com.sa/index.php/print_api/catalog';
const TIMEOUT_MS = 8000;

// Known category Arabic title -> {slug, name_en}. Unknown categories fall back
// to a slugified title. (Categories are few and change rarely; item-level data
// is fully CRM-driven.)
const CAT_MAP = {
  'ملصقات': { slug: 'stickers', name_en: 'Stickers' },
  'كروت الأعمال': { slug: 'business-cards', name_en: 'Business Cards' },
  'أوراق رسمية': { slug: 'letterhead', name_en: 'Letterhead' },
  'علب وصناديق': { slug: 'boxes', name_en: 'Boxes' },
  'أكياس': { slug: 'bags', name_en: 'Bags' },
  'ورق تغليف': { slug: 'wrapping', name_en: 'Wrapping Paper' },
  'مطبوعات المناسبات': { slug: 'occasions', name_en: 'Occasion Prints' },
  'أظرف': { slug: 'envelopes', name_en: 'Envelopes' },
};

function slugify(s, fallback) {
  const x = String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return x || fallback;
}

function normalizeOptions(opts) {
  return (opts || []).map((o) => ({
    name_ar: o.name_ar || o.name || '',
    name_en: o.name_en || '',
    type: o.type === 'tier' ? 'tier' : 'select',
    values: (o.values || []).map((v) => {
      if (typeof v === 'string') return { label_ar: v, label_en: v, price_delta: 0 };
      const label = v.label != null ? v.label : '';
      return {
        label_ar: v.label_ar != null ? v.label_ar : label,
        label_en: v.label_en != null ? v.label_en : label || (v.label_ar != null ? v.label_ar : ''),
        price_delta: Number(v.price_delta) || 0,
      };
    }),
  }));
}

/**
 * Transform the API response into the frontend catalog shape. Pure function
 * (no I/O) so it can be unit-tested. Returns { catalog, itemCount }.
 */
export function transformCatalog(api) {
  const apiCats = Array.isArray(api.categories) ? api.categories : [];
  const apiItems = Array.isArray(api.items) ? api.items : [];

  // Map the API category slug ("category-<id>") -> normalized category.
  const catByApiSlug = new Map();
  apiCats.forEach((c, i) => {
    const m = CAT_MAP[c.title];
    catByApiSlug.set(c.slug, {
      id: c.id,
      slug: m ? m.slug : slugify(c.title, 'category-' + c.id),
      title: c.title || '',
      title_en: m ? m.name_en : c.title_en || c.title || '',
      sort: typeof c.sort === 'number' ? c.sort : i,
    });
  });

  const items = apiItems.map((it) => {
    const cat = catByApiSlug.get(it.category_slug);
    const category_slug = cat ? cat.slug : slugify(it.category_slug, 'category');
    const hasImg = it.image && String(it.image).length > 0;
    return {
      id: it.id,
      slug: it.slug,
      category_slug,
      title: it.title || '',
      title_en: it.title_en || it.title || '',
      description: it.description || '',
      description_en: it.description_en || it.description || '',
      rate: Number(it.rate) || 0,
      currency: it.currency || 'SAR',
      unit_type: it.unit_type || '',
      unit_type_en: it.unit_type || '',
      requires_artwork: !!it.requires_artwork,
      images: hasImg
        ? { hero: it.image, square: it.image }
        : { hero: `/img/products/${it.slug}/hero.svg`, square: `/img/products/${it.slug}/square.svg` },
      options: normalizeOptions(it.options),
    };
  });

  // Keep only categories that actually have products; sort by API order.
  const used = new Set(items.map((i) => i.category_slug));
  const categories = Array.from(catByApiSlug.values())
    .filter((c) => used.has(c.slug))
    .sort((a, b) => a.sort - b.sort)
    .map((c) => ({ id: c.id, slug: c.slug, title: c.title, title_en: c.title_en, sort: c.sort }));

  return { catalog: { success: true, categories, items }, itemCount: items.length };
}

async function main() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(API, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data || data.success !== true || !Array.isArray(data.items)) {
      throw new Error('Unexpected payload shape');
    }
    const { catalog, itemCount } = transformCatalog(data);
    if (!itemCount) throw new Error('API returned zero items');
    await writeFile(OUT, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
    console.log(`[build-catalog] Rebuilt snapshot from live API (${itemCount} items, ${catalog.categories.length} categories).`);
  } catch (err) {
    console.warn(`[build-catalog] WARNING: could not refresh catalog (${err.message}). Keeping committed snapshot as-is.`);
  } finally {
    clearTimeout(timer);
  }
  process.exit(0);
}

// Run only when invoked directly (not when imported by a test).
if (process.argv[1] && process.argv[1].endsWith('build-catalog.mjs')) {
  main();
}

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
import { writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
// Shared, pure transform — the SAME code the browser uses for live
// reconciliation (src/lib/live-catalog.ts), so baked + live pages match.
import { transformCatalog } from '../src/lib/catalog-transform.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../src/data/catalog.json');
const QA_RAW = resolve(__dirname, '../src/data/helloprint-catalog.raw.json');
const API = 'https://crm.hawih.com.sa/index.php/print_api/catalog';
const TIMEOUT_MS = 8000;

/**
 * CATALOG SOURCE (design phase).
 *   'helloprint' → the scraped HelloPrint clone IS the store catalog (shown on
 *                  the plain home/category/product pages; no CRM, no toggle).
 *   'crm'        → normal: the real CRM catalog drives the store.
 * Flip to 'crm' to restore the real, CRM-driven storefront.
 */
const CATALOG_SOURCE = 'helloprint';

export { transformCatalog };

/**
 * Merge the HelloPrint DESIGN-QA catalog (tag 'helloprint') into the live CRM
 * raw response, at the raw layer, so the SAME transform bakes both. Every QA
 * item/category carries tag 'helloprint' and is slug-deduped against the CRM
 * (a real CRM import of the same slug always wins); QA categories sort last so
 * they never reorder the real store. The store keeps these out of the default
 * listings and only shows them under the ?qa=helloprint toggle.
 */
export async function mergeQaCatalog(api) {
  try {
    const qa = JSON.parse(await readFile(QA_RAW, 'utf8'));
    if (!qa || !Array.isArray(qa.items)) return api;
    const haveCat = new Set((api.categories || []).map((c) => c.slug));
    const haveItem = new Set((api.items || []).map((i) => i.slug));
    const cats = (qa.categories || [])
      .filter((c) => !haveCat.has(c.slug))
      .map((c) => ({ ...c, sort: (Number(c.sort) || 0) + 1000 }));
    const items = (qa.items || []).filter((i) => !haveItem.has(i.slug));
    return {
      ...api,
      categories: [...(api.categories || []), ...cats],
      items: [...(api.items || []), ...items],
    };
  } catch {
    return api; // QA data absent/unreadable → real catalog only
  }
}

async function main() {
  // Design phase: bake the HelloPrint clone AS the catalog (no CRM fetch).
  if (CATALOG_SOURCE === 'helloprint') {
    try {
      const qa = JSON.parse(await readFile(QA_RAW, 'utf8'));
      const { catalog, itemCount } = transformCatalog(qa);
      if (!itemCount) throw new Error('clone has zero items');
      await writeFile(OUT, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
      console.log(`[build-catalog] Baked HelloPrint clone as the catalog (${itemCount} items, ${catalog.categories.length} categories).`);
    } catch (err) {
      console.warn(`[build-catalog] WARNING: could not bake clone (${err.message}). Keeping committed snapshot.`);
    }
    process.exit(0);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(API, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data || data.success !== true || !Array.isArray(data.items)) {
      throw new Error('Unexpected payload shape');
    }
    if (!data.items.length) throw new Error('API returned zero items');
    const merged = await mergeQaCatalog(data);
    const { catalog, itemCount } = transformCatalog(merged);
    const qaCount = catalog.items.filter((i) => i.tag === 'helloprint').length;
    await writeFile(OUT, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
    console.log(`[build-catalog] Rebuilt snapshot from live API (${itemCount} items incl. ${qaCount} design-QA, ${catalog.categories.length} categories).`);
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

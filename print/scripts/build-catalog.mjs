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
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
// Shared, pure transform — the SAME code the browser uses for live
// reconciliation (src/lib/live-catalog.ts), so baked + live pages match.
import { transformCatalog } from '../src/lib/catalog-transform.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../src/data/catalog.json');
const API = 'https://crm.hawih.com.sa/index.php/print_api/catalog';
const TIMEOUT_MS = 8000;

export { transformCatalog };

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

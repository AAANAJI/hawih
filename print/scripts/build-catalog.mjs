#!/usr/bin/env node
/**
 * build-catalog.mjs
 * Refreshes PRICES in the committed catalog snapshot (src/data/catalog.json)
 * from the live print API — WITHOUT replacing the snapshot.
 *
 * Why merge instead of replace: the CRM API is the source of truth for volatile
 * fields (item rate, tier price deltas) but NOT for presentation data. It has
 * no product images, no semantic category slugs (it emits "category-<id>"),
 * no English category names, and it serializes select options as label objects.
 * The committed snapshot is the curated source of truth for all of that. So we
 * overlay only rate + tier deltas (matched by product slug and option/label)
 * and leave images, slugs, titles, and select values untouched.
 *
 * On ANY failure (network, non-200, malformed JSON) the snapshot is left
 * exactly as committed and the process exits 0 — the build never fails because
 * the backend is unreachable. (Runtime freshness is additionally handled in the
 * browser by src/lib/live-prices.ts.)
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../src/data/catalog.json');
const API = 'https://crm.hawih.com.sa/index.php/print_api/catalog';
const TIMEOUT_MS = 8000;

/**
 * Overlay live prices onto a curated snapshot. Pure function (no I/O) so it can
 * be unit-tested. Returns { catalog, updated } where `updated` counts changed
 * items. Never mutates `snapshot`.
 */
export function mergeLivePrices(snapshot, apiData) {
  if (!apiData || !Array.isArray(apiData.items)) return { catalog: snapshot, updated: 0 };

  // slug -> { rate, tiers: { optionName_ar -> { label -> price_delta } } }
  const live = new Map();
  for (const it of apiData.items) {
    if (!it || it.slug == null) continue;
    const tiers = {};
    for (const o of it.options || []) {
      if (o && o.type === 'tier' && Array.isArray(o.values)) {
        const byLabel = {};
        for (const v of o.values) {
          if (v && typeof v === 'object' && typeof v.price_delta === 'number') {
            byLabel[String(v.label)] = v.price_delta;
          }
        }
        tiers[o.name_ar] = byLabel;
      }
    }
    live.set(String(it.slug), { rate: Number(it.rate), tiers });
  }

  let updated = 0;
  const items = snapshot.items.map((item) => {
    const l = live.get(String(item.slug));
    if (!l) return item;
    let changed = false;
    const next = { ...item };
    if (Number.isFinite(l.rate) && l.rate !== item.rate) {
      next.rate = l.rate;
      changed = true;
    }
    if (Array.isArray(item.options)) {
      next.options = item.options.map((o) => {
        if (o.type !== 'tier' || !Array.isArray(o.values)) return o;
        const byLabel = l.tiers[o.name_ar];
        if (!byLabel) return o;
        return {
          ...o,
          values: o.values.map((v) => {
            const d = byLabel[String(v.label)];
            if (typeof d === 'number' && d !== v.price_delta) {
              changed = true;
              return { ...v, price_delta: d };
            }
            return v;
          }),
        };
      });
    }
    if (changed) updated += 1;
    return next;
  });

  return { catalog: { ...snapshot, items }, updated };
}

async function main() {
  let snapshot;
  try {
    snapshot = JSON.parse(await readFile(OUT, 'utf8'));
  } catch (err) {
    console.warn(`[build-catalog] WARNING: cannot read snapshot (${err.message}). Nothing to do.`);
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
    const { catalog, updated } = mergeLivePrices(snapshot, data);
    await writeFile(OUT, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
    console.log(`[build-catalog] Merged live prices into snapshot (${updated} item price(s) refreshed).`);
  } catch (err) {
    console.warn(`[build-catalog] WARNING: could not refresh prices (${err.message}). Keeping committed snapshot as-is.`);
  } finally {
    clearTimeout(timer);
  }
  process.exit(0);
}

// Run only when invoked directly (not when imported by a test).
if (process.argv[1] && process.argv[1].endsWith('build-catalog.mjs')) {
  main();
}

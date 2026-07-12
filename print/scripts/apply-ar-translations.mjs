#!/usr/bin/env node
/**
 * apply-ar-translations.mjs — apply Arabic product names/descriptions from
 * scripts/helloprint-ar.json onto the HelloPrint catalog artifacts.
 *
 * HelloPrint's source data is English-only, so the scrape left name_ar/title
 * and description_ar holding the English strings. This map (slug → {name_ar,
 * description_ar}) is the human/translated Arabic layer. Running this rewrites:
 *   - scripts/helloprint-import-payload.json  → item.name_ar, item.description_ar
 *   - src/data/helloprint-catalog.raw.json    → item.title,  item.description
 * The *_en / title_en / description_en fields (English) are left untouched.
 *
 *   node scripts/apply-ar-translations.mjs
 *
 * After this, re-import to the CRM (updates titles/descriptions in place):
 *   PRINT_IMPORT_TOKEN='...' python3 scripts/import_helloprint.py --no-images
 * and rebuild the store (catalog.json) so print.hawih.com.sa shows Arabic.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const AR = path.join(HERE, 'helloprint-ar.json');
const PAYLOAD = path.join(HERE, 'helloprint-import-payload.json');
const RAW = path.join(ROOT, 'src/data/helloprint-catalog.raw.json');

if (!existsSync(AR)) { console.error('missing translation map: ' + AR); process.exit(1); }
const map = JSON.parse(readFileSync(AR, 'utf8')); // { slug: { name_ar, description_ar } }
const hasArabic = (s) => /[؀-ۿ]/.test(s || '');

let missing = 0, badName = 0;
for (const [slug, v] of Object.entries(map)) {
  if (!v || !v.name_ar || !v.description_ar) { missing++; console.warn('  incomplete: ' + slug); }
  else if (!hasArabic(v.name_ar)) { badName++; console.warn('  name_ar not Arabic: ' + slug + ' = ' + v.name_ar); }
}
console.log(`translation map: ${Object.keys(map).length} slugs (${missing} incomplete, ${badName} non-Arabic names)`);

// 1) payload: name_ar / description_ar
const payload = JSON.parse(readFileSync(PAYLOAD, 'utf8'));
let pHit = 0, pMiss = 0;
for (const it of payload.items || []) {
  const t = map[it.slug];
  if (!t) { pMiss++; continue; }
  it.name_ar = t.name_ar;
  it.description_ar = t.description_ar;
  pHit++;
}
writeFileSync(PAYLOAD, JSON.stringify(payload, null, 2) + '\n');
console.log(`payload:  ${pHit} items updated, ${pMiss} without a translation`);

// 2) raw catalog: title / description (Arabic display slots)
const raw = JSON.parse(readFileSync(RAW, 'utf8'));
let rHit = 0, rMiss = 0;
for (const it of raw.items || []) {
  const t = map[it.slug];
  if (!t) { rMiss++; continue; }
  it.title = t.name_ar;
  it.description = t.description_ar;
  rHit++;
}
writeFileSync(RAW, JSON.stringify(raw, null, 2) + '\n');
console.log(`raw:      ${rHit} items updated, ${rMiss} without a translation`);
console.log('Done.');

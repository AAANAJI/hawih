#!/usr/bin/env node
/**
 * apply-hp-options.mjs — merge the scraped per-product HelloPrint configurators
 * (scripts/helloprint-options.raw.json, from scrape-hp-options.mjs) into the
 * catalog artifacts, replacing the old per-CATEGORY option templates:
 *
 *  - each item gets its OWN option groups (real structure per product);
 *  - option values carry the REAL Contentful tile image (downloaded locally to
 *    public/img/hp/opt/<assetId>.webp — never hotlinked);
 *  - real per-option price deltas where HelloPrint shows them ("+ £10.00");
 *  - the real Print-run table becomes the Quantity tier group with real
 *    per-quantity deltas, and item.rate = the first (smallest) run's price.
 *
 * Arabic labels come from scripts/helloprint-options-ar.json
 * ({ titles: {en→ar}, labels: {en→ar} }); untranslated strings fall back to
 * English so a partial map never blocks the pipeline (they're reported).
 *
 * Usage:
 *   node scripts/apply-hp-options.mjs             # transform + download images
 *   node scripts/apply-hp-options.mjs --no-images # transform only
 *   node scripts/apply-hp-options.mjs --collect   # just dump unique EN strings
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const GBP_SAR = 4.7;
const OPT_DIR = path.join(ROOT, 'public/img/hp/opt');

const rawOpts = JSON.parse(readFileSync(path.join(HERE, 'helloprint-options.raw.json'), 'utf8'));
const rawCatalogPath = path.join(ROOT, 'src/data/helloprint-catalog.raw.json');
const payloadPath = path.join(HERE, 'helloprint-import-payload.json');
const arPath = path.join(HERE, 'helloprint-options-ar.json');

const arDigits = (s) => String(s).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
const parseGBP = (s) => {
  const m = String(s || '').replace(/,/g, '').match(/£\s*([\d.]+)/);
  return m ? Number(m[1]) : 0;
};
const toSAR = (gbp) => Math.round(gbp * GBP_SAR);

// ---- collect mode: dump unique strings needing Arabic ----
if (process.argv.includes('--collect')) {
  const titles = new Set(); const labels = new Set();
  for (const r of Object.values(rawOpts)) {
    if (!r.ok) continue;
    for (const g of r.groups || []) {
      titles.add(g.title.trim());
      for (const o of g.options) labels.add(o.label.trim());
    }
  }
  const out = { titles: [...titles].sort(), labels: [...labels].sort() };
  writeFileSync(path.join(HERE, 'hp-options-strings.json'), JSON.stringify(out, null, 1));
  console.log(`collected ${out.titles.length} titles + ${out.labels.length} labels -> scripts/hp-options-strings.json`);
  process.exit(0);
}

const ar = existsSync(arPath) ? JSON.parse(readFileSync(arPath, 'utf8')) : { titles: {}, labels: {} };
// case-insensitive title index ("Material appearance" == "Material Appearance")
const titlesCI = Object.fromEntries(Object.entries(ar.titles).map(([k, v]) => [k.toLowerCase().trim(), v]));
let missT = new Set(); let missL = new Set();
const tAr = (en) => { const v = ar.titles[en.trim()] || titlesCI[en.trim().toLowerCase()]; if (!v) missT.add(en.trim()); return v || en; };
// Mechanical Arabic for pure numeric/dimension labels ("100 x 200 cm", "10,000",
// "10 mm") — no human translation needed, just digits + unit words.
const UNIT_TOK = /^(mm|cm|m|gsm|g|mic|micron|x|×|a[0-9]|b[0-9]|dl|pcs|pt)$/i;
function mechanicalAr(s) {
  const toks = s.trim().split(/([\s.,()/"×+-]+)/);
  if (!toks.filter((t) => t && !/^[\s.,()/"×+-]+$/.test(t)).every((t) => /^\d+$/.test(t) || UNIT_TOK.test(t) || t.toLowerCase() === 'x')) return '';
  return s
    .replace(/\bmm\b/gi, 'مم').replace(/\bcm\b/gi, 'سم').replace(/\bgsm\b/gi, 'غرام')
    .replace(/\bmic(ron)?\b/gi, 'ميكرون').replace(/\bpcs\b/gi, 'قطعة').replace(/\bx\b/gi, '×')
    .replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
}
const lAr = (en) => {
  const k = en.trim();
  if (ar.labels[k]) return ar.labels[k];
  const mech = mechanicalAr(k);
  if (mech) return mech;
  missL.add(k);
  return en;
};

// ---- image mapping: contentful URL -> local webp ----
const imgJobs = new Map(); // localPath -> remoteUrl
function localImage(src) {
  if (!src) return '';
  let u = src.trim();
  if (u.startsWith('//')) u = 'https:' + u;
  // asset id = the two path segments after the space id
  const m = u.match(/(?:contentful\.helloprint\.com|images\.ctfassets\.net)\/wm1n7oady8a5\/([^/]+)\/([^/]+)\//);
  if (!m) return '';
  const id = m[1];
  const local = `/img/hp/opt/${id}.webp`;
  // bigger, webp, padded white — same transform family HelloPrint uses
  const dl = u.split('?')[0] + '?w=194&h=194&fm=webp&q=80';
  imgJobs.set(local, dl);
  return local;
}

// ---- transform one scraped product into our option schema ----
function buildOptions(r) {
  const groups = [];
  for (const g of r.groups || []) {
    const values = [];
    // default (active) value first — our storefront treats values[0] as default
    const opts = [...g.options].sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0));
    for (const o of opts) {
      const v = {
        label_ar: lAr(o.label),
        label_en: o.label,
        price_delta: toSAR(parseGBP(o.price)),
      };
      if (o.recommended) v.recommended = true;
      const img = localImage(o.img);
      if (img) v.image = img;
      values.push(v);
    }
    if (values.length > 1) groups.push({ name_ar: tAr(g.title), name_en: g.title, type: 'select', values });
  }
  // real quantity table
  let rate = 0;
  if (r.printRun && r.printRun.length) {
    const base = parseGBP(r.printRun[0].price);
    rate = toSAR(base);
    const values = r.printRun.map((t) => ({
      label_ar: `${arDigits(t.qty.toLocaleString('en-US'))} نسخة`,
      label_en: `${t.qty.toLocaleString('en-US')} pcs`,
      price_delta: toSAR(parseGBP(t.price) - base),
    }));
    groups.push({ name_ar: 'الكمية', name_en: 'Quantity', type: 'tier', values });
  }
  return { groups, rate };
}

// ---- apply to raw catalog + payload ----
const raw = JSON.parse(readFileSync(rawCatalogPath, 'utf8'));
const payload = JSON.parse(readFileSync(payloadPath, 'utf8'));
const payloadBySlug = new Map(payload.items.map((it) => [it.slug, it]));

let applied = 0, skipped = 0;
for (const it of raw.items) {
  const r = rawOpts[it.slug];
  if (!r || !r.ok) { skipped++; continue; }
  const { groups, rate } = buildOptions(r);
  if (!groups.length) { skipped++; continue; }
  it.options = groups;
  if (rate > 0) it.rate = rate;
  const p = payloadBySlug.get(it.slug);
  if (p) { p.options = groups; if (rate > 0) p.rate = rate; }
  applied++;
}
writeFileSync(rawCatalogPath, JSON.stringify(raw, null, 2) + '\n');
writeFileSync(payloadPath, JSON.stringify(payload, null, 2) + '\n');
console.log(`options applied to ${applied} items (${skipped} kept previous template)`);
if (missT.size) console.log(`untranslated titles (${missT.size}):`, [...missT].slice(0, 10).join(' | '));
if (missL.size) console.log(`untranslated labels (${missL.size}):`, [...missL].slice(0, 10).join(' | '));

// ---- download tile images ----
if (!process.argv.includes('--no-images')) {
  mkdirSync(OPT_DIR, { recursive: true });
  const jobs = [...imgJobs.entries()].filter(([local]) => !existsSync(path.join(ROOT, 'public', local.replace(/^\//, ''))));
  console.log(`tile images: ${imgJobs.size} unique, ${jobs.length} to download`);
  let ok = 0, fail = 0;
  for (let i = 0; i < jobs.length; i += 8) {
    await Promise.all(jobs.slice(i, i + 8).map(async ([local, remote]) => {
      try {
        const r = await fetch(remote);
        if (!r.ok) throw new Error('http ' + r.status);
        const b = Buffer.from(await r.arrayBuffer());
        if (b.length < 100) throw new Error('tiny');
        writeFileSync(path.join(ROOT, 'public', local.replace(/^\//, '')), b);
        ok++;
      } catch { fail++; }
    }));
  }
  console.log(`tile images: downloaded=${ok} failed=${fail}`);
}
console.log('Done. Rebuild catalog.json (node scripts/build-catalog.mjs) and re-import to the CRM.');

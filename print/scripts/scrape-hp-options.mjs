#!/usr/bin/env node
/**
 * scrape-hp-options.mjs — scrape each HelloPrint PDP's REAL configurator:
 * per-product option groups (Size / Material / Paper / Finishing / Printing /
 * Corners / …) with the real Contentful tile images, real per-option price
 * deltas where HelloPrint shows them, and the real Print-run quantity → price
 * table. Fixes the "same options repeated across a category" problem — every
 * product gets its own scraped set.
 *
 * TLS note: Chromium here can't trust the session's egress-proxy CA (no NSS
 * store), so the browser never does network I/O itself — every request is
 * intercepted and fulfilled via Node fetch, which verifies TLS against
 * NODE_EXTRA_CA_CERTS. Verification stays fully enforced.
 *
 * Output: scripts/helloprint-options.raw.json
 *   { [slug]: { url, ok, groups:[{title, options:[{label, price, img,
 *     recommended, active}]}], printRun:[{qty, price}] } }
 *
 * Usage:  node scripts/scrape-hp-options.mjs [--limit N] [--only slug1,slug2]
 * Requires playwright-core (npm i -D playwright-core) + the preinstalled
 * headless shell at /opt/pw-browsers.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const OUT = path.join(HERE, 'helloprint-options.raw.json');
const EXE = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const BASE = 'https://www.helloprint.com/en-gb/';
const BLOCK = /gtm|analytics|trustpilot|oneall|recaptcha|facebook|doubleclick|hotjar|clarity|segment|youtube|cookiebot|consent|talkjs|cloudfunctions|chat|widget/i;
const CONC = 4;

const { chromium } = await import('playwright-core').catch(async () => {
  // scratchpad install fallback (session containers get reclaimed)
  const alt = '/tmp/claude-0/-home-user/b3daf646-dd6e-5a50-b23e-c7db777939ce/scratchpad/pw/node_modules/playwright-core/index.mjs';
  if (existsSync(alt)) return import(alt);
  throw new Error('playwright-core not found — npm i -D playwright-core');
});

const args = process.argv.slice(2);
const limit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : 0;
const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;

const raw = JSON.parse(readFileSync(path.join(ROOT, 'src/data/helloprint-catalog.raw.json'), 'utf8'));
let slugs = raw.items.map((it) => it.slug);
if (only) slugs = slugs.filter((s) => only.includes(s));
if (limit) slugs = slugs.slice(0, limit);

const results = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
const todo = slugs.filter((s) => !(results[s] && results[s].ok));
console.log(`[options] ${slugs.length} products, ${todo.length} to scrape (rest cached in ${path.basename(OUT)})`);

const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });

async function routeViaNode(page) {
  await page.route('**/*', async (route) => {
    const req = route.request(); const u = req.url(); const rt = req.resourceType();
    if (BLOCK.test(u) || rt === 'image' || rt === 'font' || rt === 'media') return route.abort();
    try {
      const r = await fetch(u, { method: req.method(), headers: { ...req.headers(), 'accept-encoding': 'identity' }, body: req.postData() || undefined, redirect: 'follow' });
      const body = Buffer.from(await r.arrayBuffer()); const headers = {};
      r.headers.forEach((v, k) => { if (!/^(content-encoding|content-length|transfer-encoding|connection)$/i.test(k)) headers[k] = v; });
      await route.fulfill({ status: r.status, headers, body });
    } catch { try { await route.abort(); } catch {} }
  });
}

const EXTRACT = () => {
  const txt = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
  const groups = [];
  const seenGroup = new Set();
  document.querySelectorAll('[class*="sku-step__options"]').forEach((cont) => {
    const step = cont.closest('[class*="sku-step"]:not([class*="sku-step__"])') || cont.parentElement;
    // Title candidates, best first: data-testid="pdp-step-<name>" (canonical),
    // the step's own heading, else the previous sibling's heading (some steps
    // render their title outside the step element).
    const tid = (step.getAttribute('data-testid') || '').replace(/^pdp-step-/, '').replace(/-/g, ' ');
    const own = txt(step.querySelector('[class*="sku-step__title"], h3, legend'));
    const prev = txt(step.previousElementSibling && step.previousElementSibling.matches('h2,h3,h4,[class*="title"]') ? step.previousElementSibling : null);
    const rawTitle = tid || own || prev;
    const opts = []; const seen = new Set();
    cont.querySelectorAll(':scope > [class*="sku-step__option"]').forEach((o) => {
      if (/show-more|recommended-label/.test(o.className)) return;
      const img = o.querySelector('img');
      const label = txt(o.querySelector('[class*="option-item__text"]')) || txt(o).replace(/Recommended/g, '').trim();
      if (!label || seen.has(label)) return; seen.add(label);
      opts.push({
        label,
        price: txt(o.querySelector('[class*="option-item__price"]')),
        img: img ? (img.getAttribute('src') || '') : '',
        recommended: /is-recommended/.test(o.className),
        active: /--active/.test(o.className),
      });
    });
    const key = rawTitle + '|' + opts.map((x) => x.label).join(',');
    if (opts.length && !seenGroup.has(key)) { seenGroup.add(key); groups.push({ rawTitle, options: opts }); }
  });
  return groups;
};

function postProcess(groupsRaw) {
  const byTitle = new Map(); let printRun = null;
  const titleCase = (s) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());
  for (const g of groupsRaw) {
    // title = text before ':' of the step heading; headings look like "Size: 85 x 55 mm"
    let title = (g.rawTitle || '').split(':')[0].trim();
    const labels = g.options.map((o) => o.label.toLowerCase()).join(' ');
    if (!title) { // heading was rendered oddly — infer from the values
      if (/printing/.test(labels)) title = 'Printing';
      else if (/corners/.test(labels)) title = 'Corners';
      else if (/matt|glossy|uncoated|eco|satin|silk|kraft/.test(labels)) title = 'Material Type';
      else title = 'Options';
    }
    title = titleCase(title);
    if (/delivery|date|when do you|estimated/i.test(title) || /week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december/i.test(g.options[0]?.label || '')) continue; // dynamic delivery dates — not catalog data
    if (/print ?run|quantity/i.test(title) || (g.options.length > 6 && g.options.every((o) => /^[\d,.]+$/.test(o.label.replace(/\s/g, ''))))) {
      const tiers = g.options.map((o) => ({ qty: Number(o.label.replace(/[^\d]/g, '')), price: o.price })).filter((x) => x.qty > 0);
      if (!printRun || tiers.length > printRun.length) printRun = tiers;
      continue;
    }
    // Merge same-title groups — desktop/mobile render the SAME step twice,
    // sometimes each holding only a subset of the values.
    if (!byTitle.has(title)) byTitle.set(title, { title, options: [] });
    const tgt = byTitle.get(title);
    for (const o of g.options) {
      if (!tgt.options.some((x) => x.label === o.label)) tgt.options.push(o);
    }
  }
  return { groups: [...byTitle.values()].filter((g) => g.options.length > 1), printRun };
}

async function scrapeOne(page, slug) {
  const url = BASE + slug.replace(/^hp-/, '');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => document.querySelectorAll('[class*="sku-step__option"]').length > 3, { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(3500);
  const groupsRaw = await page.evaluate(EXTRACT);
  const { groups, printRun } = postProcess(groupsRaw);
  return { url, ok: groups.length > 0 || !!printRun, groups, printRun };
}

let done = 0, okCount = 0, failCount = 0;
const queue = [...todo];
async function worker(id) {
  const page = await browser.newPage({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36', viewport: { width: 1360, height: 900 } });
  await routeViaNode(page);
  while (queue.length) {
    const slug = queue.shift();
    try {
      const r = await scrapeOne(page, slug);
      results[slug] = r;
      if (r.ok) okCount++; else failCount++;
    } catch (e) {
      results[slug] = { url: BASE + slug.replace(/^hp-/, ''), ok: false, error: String(e).slice(0, 120) };
      failCount++;
    }
    done++;
    if (done % 10 === 0) {
      writeFileSync(OUT, JSON.stringify(results, null, 1));
      console.log(`  ${done}/${todo.length}  ok=${okCount} fail=${failCount}`);
    }
  }
  await page.close();
}

await Promise.all(Array.from({ length: CONC }, (_, i) => worker(i)));
writeFileSync(OUT, JSON.stringify(results, null, 1));
console.log(`[options] DONE ok=${okCount} fail=${failCount} -> ${OUT}`);
await browser.close();

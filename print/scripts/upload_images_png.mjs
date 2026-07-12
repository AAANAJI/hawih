#!/usr/bin/env node
/**
 * upload_images_png.mjs — one-shot: convert each HelloPrint product webp mockup
 * to PNG and upload it as the item's hero image to the Hawih CRM.
 *
 * Why PNG: the CRM's global `accepted_file_formats` setting rejects webp in the
 * shared upload validator (is_valid_file_to_upload), even though the import_image
 * endpoint whitelists webp. PNG is universally accepted, so we transcode on the
 * way out. Independent of the store's own static webp assets.
 *
 *   PRINT_IMPORT_TOKEN='...' node scripts/upload_images_png.mjs
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const CRM = (process.env.CRM || 'https://crm.hawih.com.sa').replace(/\/$/, '');
const TOKEN = process.env.PRINT_IMPORT_TOKEN || '';
const URL = `${CRM}/index.php/print_api/import_image`;

if (!TOKEN) { console.error('Set PRINT_IMPORT_TOKEN'); process.exit(1); }

const payload = JSON.parse(await readFile(path.join(HERE, 'helloprint-import-payload.json'), 'utf8'));
const items = payload.items || [];
console.log(`Uploading ${items.length} images as PNG -> ${URL}`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ok = 0, miss = 0, fail = 0;
const failures = [];
for (let i = 0; i < items.length; i++) {
  const it = items[i];
  const rel = it.image_file;
  if (!rel) { continue; }
  const fp = path.join(ROOT, rel);
  if (!existsSync(fp)) { miss++; failures.push(`${it.slug}: missing ${rel}`); continue; }

  let pngBuf;
  try {
    pngBuf = await sharp(fp).png({ quality: 90 }).toBuffer();
  } catch (e) {
    fail++; failures.push(`${it.slug}: convert ${e.message}`); continue;
  }

  const fd = new FormData();
  fd.set('slug', it.slug);
  fd.set('image', new Blob([pngBuf], { type: 'image/png' }), `${it.slug}.png`);

  let attempt = 0, done = false;
  while (attempt < 5 && !done) {
    attempt++;
    try {
      const res = await fetch(URL, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}` }, body: fd });
      if (res.status === 429) { await sleep(1000 * attempt); continue; }
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.success) { ok++; done = true; }
      else { fail++; failures.push(`${it.slug}: HTTP ${res.status} ${body.message || ''}`); done = true; }
    } catch (e) {
      if (attempt >= 5) { fail++; failures.push(`${it.slug}: ${e.message}`); done = true; }
      else await sleep(1000 * attempt);
    }
  }
  // gentle pacing to stay under the endpoint's rate guard (120/60s)
  await sleep(150);
  if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${items.length}  ok=${ok} fail=${fail} miss=${miss}`);
}

console.log(`\nDONE  uploaded=${ok}  missing=${miss}  failed=${fail}`);
if (failures.length) { console.log('Failures:'); failures.forEach((f) => console.log('  ! ' + f)); }

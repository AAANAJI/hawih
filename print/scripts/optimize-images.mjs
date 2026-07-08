#!/usr/bin/env node
/**
 * optimize-images.mjs
 *
 * Walks print/public/img/ recursively and converts every .png/.jpg/.jpeg raster
 * into an optimized .webp (quality 80, metadata stripped). For each source it also
 * emits a half-width `-sm` variant next to the full-size webp:
 *     hero.png  ->  hero.webp  +  hero-sm.webp
 *
 * SVGs and existing .webp files are left untouched (SVGs are already optimal;
 * the catalog references .svg placeholders until generated art lands).
 *
 * Guardrails — this script is a safe no-op when:
 *   - the `sharp` dependency is not installed, or
 *   - the img directory doesn't exist, or
 *   - there are no raster inputs to convert.
 * It never throws the build; it warns and exits 0.
 *
 * Usage:  node print/scripts/optimize-images.mjs
 * Idempotent-ish: re-run only rewrites outputs whose source is newer.
 */

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMG_DIR = path.resolve(__dirname, '..', 'public', 'img');

const WEBP_QUALITY = 80;
const SM_DIVISOR = 2; // -sm variant is half the source width
const RASTER = new Set(['.png', '.jpg', '.jpeg']);

async function main() {
  // Guard: input directory present?
  if (!existsSync(IMG_DIR)) {
    console.warn(`[optimize-images] no img directory at ${IMG_DIR} — nothing to do.`);
    return;
  }

  // Guard: sharp available?
  let sharp;
  try {
    ({ default: sharp } = await import('sharp'));
  } catch {
    console.warn('[optimize-images] "sharp" not installed — skipping (no-op).');
    return;
  }

  const inputs = [];
  await walk(IMG_DIR, inputs);

  if (inputs.length === 0) {
    console.warn('[optimize-images] no .png/.jpg inputs found — nothing to convert.');
    return;
  }

  let converted = 0;
  let skipped = 0;

  for (const src of inputs) {
    const dir = path.dirname(src);
    const base = path.basename(src, path.extname(src));
    const outFull = path.join(dir, `${base}.webp`);
    const outSm = path.join(dir, `${base}-sm.webp`);

    if (await isFresh(src, outFull) && await isFresh(src, outSm)) {
      skipped++;
      continue;
    }

    try {
      const img = sharp(src).rotate(); // respect EXIF orientation, then strip metadata
      const meta = await img.metadata();

      // Full-size webp (metadata stripped by default — no .withMetadata()).
      await sharp(src)
        .rotate()
        .webp({ quality: WEBP_QUALITY })
        .toFile(outFull);

      // Half-width -sm variant.
      const smWidth = Math.max(1, Math.round((meta.width || 2) / SM_DIVISOR));
      await sharp(src)
        .rotate()
        .resize({ width: smWidth, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toFile(outSm);

      converted++;
      console.log(`[optimize-images] ${rel(src)} -> ${rel(outFull)} + ${rel(outSm)}`);
    } catch (err) {
      console.warn(`[optimize-images] failed on ${rel(src)}: ${err.message}`);
    }
  }

  console.log(
    `[optimize-images] done — ${converted} converted, ${skipped} up-to-date, ${inputs.length} total.`
  );
}

async function walk(dir, out) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      await walk(full, out);
    } else if (RASTER.has(path.extname(e.name).toLowerCase())) {
      out.push(full);
    }
  }
}

/** True if `out` exists and is at least as new as `src`. */
async function isFresh(src, out) {
  try {
    const [s, o] = await Promise.all([fs.stat(src), fs.stat(out)]);
    return o.mtimeMs >= s.mtimeMs;
  } catch {
    return false;
  }
}

function rel(p) {
  return path.relative(path.resolve(__dirname, '..'), p);
}

main().catch((err) => {
  // Never fail the build on optimization.
  console.warn(`[optimize-images] unexpected error (ignored): ${err.message}`);
});

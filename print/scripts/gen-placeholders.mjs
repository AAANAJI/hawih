#!/usr/bin/env node
/**
 * gen-placeholders.mjs — writes on-brand SVG placeholder images.
 * Paper-tone background + cobalt geometric motif + product/category name in
 * IBM Plex Sans Arabic. Lightweight, inline-styled .svg.
 *
 * NOTE (Phase 2): these are swapped for generated .webp product photos.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const catalog = JSON.parse(readFileSync(resolve(ROOT, 'src/data/catalog.json'), 'utf8'));

const PAPER = '#F4F1EB';
const PAPER2 = '#E9E4D7';
const INK = '#0B0B10';
const BLUE = '#1F1FFE';
const FONT = "'IBM Plex Sans Arabic','Inter',sans-serif";

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Deterministic geometric motif seeded by a string. */
function motif(w, h, seed) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) & 0xffff;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const shapes = [];
  // Big soft cobalt circle (glow)
  const cx = w * (0.62 + rnd() * 0.28);
  const cy = h * (0.28 + rnd() * 0.3);
  const r = Math.min(w, h) * (0.26 + rnd() * 0.12);
  shapes.push(`<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${r.toFixed(0)}" fill="${BLUE}" opacity="0.10"/>`);
  shapes.push(`<circle cx="${cx.toFixed(0)}" cy="${cy.toFixed(0)}" r="${(r * 0.62).toFixed(0)}" fill="none" stroke="${BLUE}" stroke-width="2" opacity="0.5"/>`);
  // Thin cobalt lines
  for (let i = 0; i < 3; i++) {
    const y = h * (0.16 + i * 0.06 + rnd() * 0.02);
    shapes.push(`<rect x="${(w * 0.08).toFixed(0)}" y="${y.toFixed(0)}" width="${(w * (0.18 + rnd() * 0.2)).toFixed(0)}" height="6" rx="3" fill="${BLUE}" opacity="${(0.5 - i * 0.12).toFixed(2)}"/>`);
  }
  // A rotated square outline
  const sq = Math.min(w, h) * 0.18;
  const sx = w * (0.14 + rnd() * 0.1);
  const sy = h * (0.6 + rnd() * 0.12);
  shapes.push(`<rect x="${sx.toFixed(0)}" y="${sy.toFixed(0)}" width="${sq.toFixed(0)}" height="${sq.toFixed(0)}" rx="10" fill="none" stroke="${INK}" stroke-width="2" opacity="0.14" transform="rotate(12 ${(sx + sq / 2).toFixed(0)} ${(sy + sq / 2).toFixed(0)})"/>`);
  return shapes.join('\n    ');
}

function svg({ w, h, title, subtitle, titleSize }) {
  const ts = titleSize ?? Math.round(Math.min(w, h) * 0.075);
  const ss = Math.round(ts * 0.4);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${PAPER}"/>
      <stop offset="1" stop-color="${PAPER2}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <g>
    ${motif(w, h, title)}
  </g>
  <g font-family="${FONT}">
    ${subtitle ? `<text x="${Math.round(w * 0.08)}" y="${Math.round(h * 0.5)}" font-size="${ss}" font-weight="600" fill="${BLUE}" letter-spacing="0.04em">${esc(subtitle)}</text>` : ''}
    <text x="${Math.round(w * 0.08)}" y="${Math.round(h * (subtitle ? 0.58 : 0.54))}" font-size="${ts}" font-weight="700" fill="${INK}">${esc(title)}</text>
  </g>
  <rect x="0" y="${h - 10}" width="${w}" height="10" fill="${BLUE}"/>
</svg>
`;
}

async function write(path, content) {
  const full = resolve(ROOT, 'public', path);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, content, 'utf8');
}

const catMap = Object.fromEntries(catalog.categories.map((c) => [c.slug, c]));

async function main() {
  // Products: hero (1600x1200) + square (1200x1200)
  for (const item of catalog.items) {
    const cat = catMap[item.category_slug];
    const sub = cat ? cat.title : 'مطبعة هوية';
    await write(`img/products/${item.slug}/hero.svg`, svg({ w: 1600, h: 1200, title: item.title, subtitle: sub }));
    await write(`img/products/${item.slug}/square.svg`, svg({ w: 1200, h: 1200, title: item.title, subtitle: sub, titleSize: 82 }));
  }
  // Categories: 1200x900
  for (const cat of catalog.categories) {
    await write(`img/categories/${cat.slug}.svg`, svg({ w: 1200, h: 900, title: cat.title, subtitle: 'مطبعة هوية' }));
  }
  // Home hero: 2400x1200
  await write('img/home/hero.svg', svg({ w: 2400, h: 1200, title: 'طباعة استثنائية لعلامتك', subtitle: 'مطبعة هوية', titleSize: 150 }));
  // OG default: 1200x630
  await write('img/og/default.svg', svg({ w: 1200, h: 630, title: 'مطبعة هوية', subtitle: 'طباعة استثنائية لعلامتك', titleSize: 96 }));

  console.log('[gen-placeholders] wrote product, category, hero and og SVGs.');
}
main();

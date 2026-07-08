#!/usr/bin/env node
/**
 * build-catalog.mjs
 * Fetches the live catalog from the print API and overwrites the committed
 * snapshot at src/data/catalog.json. On ANY failure (network, non-200,
 * malformed JSON) it keeps the existing committed snapshot, prints a warning,
 * and exits 0 so the build NEVER fails because the backend is unreachable.
 */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../src/data/catalog.json');
const API = 'https://crm.hawih.com.sa/index.php/print_api/catalog';
const TIMEOUT_MS = 8000;

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
    await writeFile(OUT, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log(`[build-catalog] Updated snapshot from live API (${data.items.length} items).`);
  } catch (err) {
    console.warn(`[build-catalog] WARNING: could not refresh catalog (${err.message}). Keeping committed snapshot.`);
  } finally {
    clearTimeout(timer);
  }
  process.exit(0);
}

main();

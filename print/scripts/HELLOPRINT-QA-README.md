# HelloPrint catalog clone (design/QA)

A **real** clone of HelloPrint's print catalog — **19 categories, ~159 products**
scraped from helloprint.com's public product index: real product **names,
descriptions, prices, quantity tiers, and mockup images**, paired with real
HelloPrint-style option groups (size / paper / finishing / sides / corners).
Every row is tagged **`helloprint`**. Brand references (HelloPrint / PrintPortal)
are stripped from the copy; prices are converted GBP→SAR.

> **For design/QA only.** This is scaffolding to nail the look, feel and catalog
> skeleton against the real thing — replace the imagery and copy with your own
> before launch. HelloPrint's images/descriptions are their property.

## View it in the store (nothing to install)

Behind the usual preview key, append `?qa=helloprint`:

```
https://print.hawih.com.sa/?preview=hawih-preview-7Qk2mZ&qa=helloprint
```

- Swaps the live catalog for the HelloPrint clone (remembered in `localStorage`,
  persists across home → category → product). Exit with `?qa=off`.
- The **real** catalog (your items) is the default and is never mixed with these —
  they're filtered out of every real listing by tag and only `?qa` brings them in.

## Re-scrape / rebuild

```
node scripts/scrape-helloprint.mjs   # rewrites raw.json + import payload + downloads images
npm run build                         # folds the clone into catalog.json
```

`scrape-helloprint.mjs` pulls fresh data from HelloPrint's Algolia product index,
filters to the print catalog (skips promo merch), and downloads product mockups
to `public/img/hp/prod/*.webp`.

## Load it into the CRM — optionally replacing your catalog

Needs your CRM `print_import_token` (set that setting to any secret first). The
importer **backs up your current catalog first**, and any purge is a **reversible
soft-delete** (nothing is hard-deleted).

```
export PRINT_IMPORT_TOKEN='<that same secret>'

# Wipe the existing print catalog, then import the clone + images:
python3 scripts/import_helloprint.py --purge

# Or add the clone alongside your items (no wipe):
python3 scripts/import_helloprint.py

# Preview the plan without sending anything:
python3 scripts/import_helloprint.py --dry-run
```

- `--purge` soft-deletes **every** print item; `--purge-tag helloprint` removes
  only a previous clone import (leaves your real catalog).
- The current catalog is saved to `scripts/helloprint-backup-catalog.json` before
  anything is deleted.
- Images are the real webp mockups shipped in `public/img/hp/prod/` and uploaded
  as-is (`import_image` accepts webp).
- Stdlib-only Python 3 — no `pip install`.

Once imported, the storefront picks the clone up on its next rebuild/live-sync,
and you can manage the set in the CRM Items list by filtering the
**`print_import_tag`** column (= `helloprint`).

## Undo

- **Store:** delete `src/data/helloprint-catalog.raw.json` (and `public/img/hp/`),
  then `npm run build`. The merge is a no-op when the file is absent.
- **CRM:** restore from `helloprint-backup-catalog.json`, or filter Items by
  `print_import_tag = helloprint` and delete; purged items are soft-deleted
  (`deleted=1`) and can be flipped back.

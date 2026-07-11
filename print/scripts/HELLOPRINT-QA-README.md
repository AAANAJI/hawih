# HelloPrint design-QA catalog

A faithful, HelloPrint-modelled catalog — **18 categories, 65 products**, real
option structures (size / paper / finishing / sides / corners / quantity tiers),
realistic SAR prices, and clean generic tile images — imported **for design/QA
comparison only**. Every row is tagged **`helloprint`** so the whole set is
selectable and removable in one go, and is kept out of the real storefront.

> This exists so you can put the Hawih store head-to-head with helloprint.com on
> the same catalog — product pages, spec icons, promo/section boxes, option
> cards. It is **not** meant to go live; your real items are unaffected.

## View it in the store (nothing to install)

The store already ships the catalog in a **baked snapshot**, gated behind a
toggle. On any store URL (behind the usual preview key):

```
https://print.hawih.com.sa/?preview=hawih-preview-7Qk2mZ&qa=helloprint
```

- `?qa=helloprint` swaps the live catalog for the HelloPrint one (remembered in
  `localStorage`, so it persists as you browse home → category → product).
- A small **“وضع مقارنة التصميم · HelloPrint”** pill appears bottom-start with an
  **Exit** link, or append `?qa=off` to any URL.
- The real catalog (your 231 items) is the default and is **never** mixed with
  these — they’re filtered out of every real listing by tag and only the `?qa`
  toggle brings them in.

## How it’s wired (so it can never leak to launch)

| Piece | File |
|---|---|
| Dataset (raw API shape, tagged) | `src/data/helloprint-catalog.raw.json` |
| Generator (dataset + images + import payload) | `scripts/gen-helloprint-catalog.mjs` |
| Generic tile images (per product) | `public/img/hp/prod/*.svg` |
| Build merge (folds QA into `catalog.json`, slug-deduped, sorted last) | `scripts/build-catalog.mjs` |
| Real-only listing exports (`displayItems` / `displayCategories`) | `src/lib/catalog.ts` |
| Runtime toggle (`?qa` → serve QA catalog) | `src/layouts/Base.astro`, `src/lib/live-catalog.ts` |

The QA product/category pages are built statically (so their option cards + spec
icons are real pages), but they’re excluded from home, `/products`, the header
nav and every category grid unless the toggle is on.

## Regenerate the dataset

```
node scripts/gen-helloprint-catalog.mjs   # rewrites raw.json, tile SVGs, import payload
npm run build                             # folds it into catalog.json
```

## Import into the CRM (optional — needs your token)

Only if you want the items to live in the CRM Items admin (to manage/remove them
there). The store QA view does **not** need this.

1. In the CRM, set the setting **`print_import_token`** to any secret string
   (this arms the token-gated import endpoints).
2. Run:

   ```
   export PRINT_IMPORT_TOKEN='<that same secret>'
   python3 scripts/import_helloprint.py                # categories + items + images
   python3 scripts/import_helloprint.py --dry-run       # preview, sends nothing
   ```

   Stdlib-only Python 3 — no `pip install`. Images (SVG tiles) are converted to
   PNG on the fly if `rsvg-convert` / `inkscape` / ImageMagick / `cairosvg` is
   available; otherwise image upload is skipped (harmless — the store QA view
   uses its own baked SVGs).
3. In the CRM Items list, filter/sort by the **`print_import_tag`** column
   (= `helloprint`) to see, select and manage the whole set.

Imported items carry `price_mode = exact` (fixed SAR prices) and stay tagged, so
the store keeps filtering them out of the real listings automatically.

## Remove the whole set

- **From the store:** delete `src/data/helloprint-catalog.raw.json` (and
  optionally `public/img/hp/`), then `npm run build`. The merge is a no-op when
  the file is absent — the real catalog is all that remains.
- **From the CRM (if imported):** in the Items list, filter by
  `print_import_tag = helloprint` and bulk-delete.

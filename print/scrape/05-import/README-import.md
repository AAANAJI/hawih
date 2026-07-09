# Bulk-import the print catalog into the CRM

`import_to_crm.py` loads your processed catalog (`catalog-skeleton.json`), the
SAR prices (`catalog-review.xlsx`), and your product images, and pushes them
into the **Rise CRM** — the single source of truth behind print.hawih.com.sa.
Once in the CRM, the store reflects everything automatically: live for existing
pages, and on the next rebuild for brand-new product pages + the sitemap.

You run it **locally** (it needs your files + images). It talks to a token-gated
import API on the CRM: `print_api/import` and `print_api/import_image`.

Prices come **only** from the xlsx (the real Hawih prices). The weej reference
prices and every `reference_*` field are never sent, and a forbidden-string scan
(`weej`, `ويج`, brand teal, phone numbers) runs before anything is pushed.

---

## Setup — all on your Mac (no server access needed)

Auth is just your **CRM admin login**. The script signs in over HTTPS with your
email + password (the same ones you use on crm.hawih.com.sa) — nothing to set up
on the server, no token, no database.

```bash
cd "print hawih/…/print/scrape/05-import"   # wherever this folder lives
python3 -m venv .venv && source .venv/bin/activate
python3 -m pip install -r requirements.txt
cp .env.example .env
# edit .env: your CRM_ADMIN_EMAIL + CRM_ADMIN_PASSWORD, and the file/image paths
```

(You must be a CRM **admin** — the import endpoint only accepts an admin team
member. It only works on the Hawih tenant; Shfrah returns 404.)

---

## Run it — dry-run → pilot → go

Always start with a dry run (no server writes):

```bash
python3 import_to_crm.py --dry-run
```

This writes `output/preflight-report.md` (counts), `output/blocked.csv` (any
unpriced/uncategorised services), and `output/payload-preview.json` (the exact
first-10 payload) so you can eyeball the mapping. Nothing is sent.

Pilot a handful as hidden drafts, then check them in the CRM (Items list):

```bash
python3 import_to_crm.py --pilot 5
```

When happy, push everything (still hidden):

```bash
python3 import_to_crm.py --go
```

Add images (hero image per service, from `IMAGES_DIR`):

```bash
python3 import_to_crm.py --go --images
```

Make them visible in the store (drops the hidden/draft flag):

```bash
python3 import_to_crm.py --go --images --publish
```

Re-running is safe — items are matched by `slug_en` (upsert), so a second run
updates rather than duplicates.

---

## After import

- **Categories, names, prices, options, category membership** show on the store
  **live** (next page load) for any already-published page.
- **Brand-new product pages + the sitemap** are generated on the next store
  rebuild — either wait for the nightly run (06:00 Riyadh) or trigger
  **“Deploy print store”** in GitHub Actions now.
- Imported categories carry their English name + slug automatically (the CRM
  stores them in a `print_category_meta` setting the store reads).

## Outputs (in `output/`)

| File | What |
|---|---|
| `preflight-report.md` | counts (importable / blocked / categories / prices) |
| `blocked.csv` | services skipped (no price / unknown category) — fix + re-run |
| `payload-preview.json` | exact first-10 payload (dry-run) |
| `publish-log.jsonl` | one line per API call (status + response) |
| `sync-ledger.json` | `slug → {store_item_id, status, image}` for re-syncs |

## Notes & assumptions

- **Pricing model:** the store shows `base + option surcharge`. Base = the
  cheapest tier price; each option value’s surcharge = its tier price − base
  (from the xlsx). This is exact for single-option (quantity) services and a
  good approximation for multi-option ones — verify the pilot and adjust prices
  in the xlsx if needed.
- **Option types:** `file-upload` / `image` options become the product’s
  built-in artwork upload (`requires_artwork`); `note` / `text` / `textarea`
  personalization inputs are not modelled as priced options and are skipped.
- **Images:** you said you’ll use existing images now and replace them later —
  fine; re-running `--images` replaces an item’s hero image. ⚠️ Do **not** use
  the weej reference photos under `04-images/reference/` on the live store
  (copyright — your handoff forbids it); point `IMAGES_DIR` at your own images.
- **Demo data:** the store still has ~9 demo items/categories from earlier. If a
  demo category’s Arabic title collides with an imported one, delete the demo
  category in the CRM after import.

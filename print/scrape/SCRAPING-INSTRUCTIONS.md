# Scraping & Import Contract

This directory does **not** run the weej.sa extraction. The full crawl of weej.sa is
performed by a **separate, owner-run agent** on the owner's machine. This document defines
the **import contract** that connects that agent's raw output to the HAWIH catalog seed, so
a dropped dataset imports **without rework**, plus the legal guardrails everyone must honor.

---

## 1. Pipeline

```
  weej.sa  ──(owner-run scraper, separate agent)──►  products.json   (raw extraction)
                                                          │
                                          curation + rewrite (this repo)
                                                          ▼
                                          reference/seed/hawih-catalog.json
                                                          │
                                          07_generate_seed_sql.py
                                                          ▼
                                          reference/seed/items-seed.sql
                                                          │
                                          apply AFTER migration 007 → HAWIH tenant DB
```

The only hand-off object is **`products.json`**. Everything downstream is deterministic and
lives in this repo.

## 2. `products.json` — raw extraction schema

The owner-run scraper emits an array of raw products. Expected shape (extra fields ignored):

```jsonc
[
  {
    "source_url": "https://weej.sa/...",      // provenance, internal only
    "category": "…",                          // free-text category label (Arabic/English)
    "title": "…",                             // raw product title
    "price": 49,                              // number or price string; SAR assumed
    "description": "…",                       // raw marketing copy (DO NOT publish verbatim)
    "options": [                              // best-effort option extraction
      { "name": "…", "type": "select|tier", "values": ["…"] }
    ],
    "images": ["https://weej.sa/...jpg"]      // reference URLs, internal only
  }
]
```

`products.json` is a **staging artifact**: it is gitignored, never shipped, and never
published. It exists only to be curated into the catalog.

## 3. Curation → `hawih-catalog.json`

Map raw entries onto the **canonical contract** in `reference/seed/hawih-catalog.json`
(see that file for the authoritative shape). During curation you MUST:

1. **Rewrite all copy.** No scraped sentence survives. Titles and descriptions are written
   fresh in natural Saudi print-shop Arabic + matching English. Bake turnaround into the
   description (التنفيذ 3-7 أيام عمل، التوصيل 2-5 أيام).
2. **Normalize categories** to the 8 canonical slugs
   (`stickers, business-cards, letterhead, boxes, bags, wrapping, occasions, envelopes`).
3. **Normalize options** into `select` groups + one `tier` quantity group whose values are
   `{label, price_delta}` (deltas in SAR relative to the base `rate`).
4. **Assign SAR prices** as the base `rate`; keep `currency:"SAR"`, `min_qty:1`,
   `requires_artwork:true`, `unit_type_ar:"الطلب"`/`unit_type_en:"order"`.
5. **Point images** at generated placeholders `/img/products/{slug}/hero.svg` + `square.svg`
   — never at scraped URLs.

Keys are **slugs** (stable); ids are assigned by the live API at import time.

## 4. Generate the SQL

```
python3 07_generate_seed_sql.py
```

Reads `hawih-catalog.json`, writes idempotent `reference/seed/items-seed.sql`
(`INSERT … SELECT … WHERE NOT EXISTS`). Apply to the **HAWIH tenant DB only, AFTER
migration 007** (which creates the `print_*` custom fields). Safe to re-run.

## 5. Legal guardrail (non-negotiable)

- **Scraped assets are internal reference only.** `products.json`, any downloaded weej
  imagery, and raw HTML stay **gitignored** and are **never published** to the store.
- **All published imagery is AI-generated** per `brand/style-guide.md`. Scraped photos are
  used **only as composition reference** for prompts — never traced, cropped, or shipped.
- **All published copy is rewritten** from scratch. No scraped title, description, or
  marketing phrase is published verbatim.
- Provenance fields (`source_url`, scraped `images`) exist only to aid curation and must be
  stripped before anything reaches the catalog or the store.

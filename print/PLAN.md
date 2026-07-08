# print.hawih.com.sa — Master Execution Plan

**Version 1.0 · 2026-07-08 · Status: approved for execution**

This document is the authoritative, execution-ready plan for building the Hawih printing-services store at **https://print.hawih.com.sa**. It was produced from verified reconnaissance of weej.sa (reference competitor), the Rise CRM codebase (`aaanaji/CRM`), and this repository. It is written for an executor (AI or human) to implement **without further product decisions** — every choice has been made and confirmed by the owner.

Companion documents (read them when their phase starts):

| Doc | Path | Covers |
|---|---|---|
| Scraping workflow + import contract | `print/scrape/SCRAPING-INSTRUCTIONS.md` (this repo) | Phase 1 |
| Image-generation style guide | `print/brand/style-guide.md` (this repo) | Phase 2 |
| Demo catalog seed data | `print/reference/seed/hawih-catalog.json` (this repo) | Phase 2 |
| Backend spec (API, migrations, MCP tools) | `docs/print-store-backend-plan.md` (repo `aaanaji/CRM`) | Phase 3 |

---

## 0. Mission and owner decisions

Hawih Business launches an exceptional printing-services store: catalog + product pages with options, artwork upload, cart, checkout, client account with order tracking and invoices — all backed by the existing Rise CRM at `crm.hawih.com.sa` (signup, orders, files, invoicing, admin dashboard live there). The store is separate in design/function from hawih.com.sa but carries full Hawih identity (brand tokens, fonts, logos, GTM, structured-data linkage to the Hawih organization).

**Owner decisions (confirmed 2026-07-08 — do not reopen):**

1. **Payments: manual-first.** Checkout completes with no online payment: order → auto-invoice in CRM → bank-transfer instructions + WhatsApp confirmation CTA; admin records payment in Rise. A Moyasar gateway module is fully specced (Phase 8) and stays dormant until merchant keys exist.
2. **Bilingual AR + EN from day one.** Arabic-first, RTL default at `/`; English mirror at `/en/`. Reciprocal hreflang from launch.
3. **Catalog: demo-first.** A separate agent (run by the owner) is extracting the full weej.sa catalog (~360 products). This build seeds **8–10 demo products** (`print/reference/seed/hawih-catalog.json`) for end-to-end testing. The full catalog imports later through the import contract in `print/scrape/SCRAPING-INSTRUCTIONS.md` — same pipeline, no rework.
4. **Scraped weej.sa assets are internal reference only.** Never published, never committed (images/raw HTML are gitignored), never deployed. All published imagery is AI-generated per the style guide; all copy is written fresh.

---

## 1. Verified ground truth (do not re-derive; verified 2026-07-08)

### 1.1 weej.sa (reference competitor)

- Platform: **Salla** (cdn.salla.sa, twilight theme).
- `https://weej.sa/sitemap.xml` → sitemap index → `/ar/sitemap-1.xml` (34 category URLs `/ar/category/{code}` + 3 policy pages) and `/ar/sitemap-2.xml` (~360 product URLs `/ar/{code}`, each with `<image:image>` entries at 1000×1000).
- Product pages carry **static JSON-LD `schema.org/Product`** (name, description, SKU, offers price/currency/availability, image) + `og:` meta — extractable without JS.
- Product pages include **file-upload (إرفاق ملف)** and **notes (إضافة ملاحظة)** fields — the core print-ordering UX to replicate.
- Category product grids are **client-side rendered** (Salla web components) — plain fetch sees no products; Playwright required for category membership and option values.
- Top categories: ستيكرات (stickers), بطاقات (cards), بوكسات (boxes), اكياس (bags), ورق تغليف (wrapping paper), مطبوعات المناسبات (occasion prints), ظرف (envelopes).

### 1.2 Backend repo `aaanaji/CRM` (Rise CRM 3.9.6 fork "Nabtah", CodeIgniter 4, PHP 8.1)

- **Multi-tenant**: every push to `main` deploys to **both** Hawih (`crm.hawih.com.sa`, web root `/var/www/hawih`, host 108.61.89.48) and Shfrah (`crm.shfrah.com`, 149.28.38.155). All changes must be tenant-safe. DB prefix `rise_`.
- `Store::place_order()` — `app/Controllers/Store.php:512` — canonical order creation: `move_files_from_temp_dir_to_permanent_dir(get_setting("timeline_file_path"), "order")` → `Orders_model->ci_save()` (status = `Order_status_model->get_first_status()`, `tax_id = get_setting('order_tax_id')`, `company_id = get_default_company_id()`) → per-item `Order_items_model->ci_save()` → optional `create_invoice_from_order($order_id)` (`app/Helpers/general_helper.php:2602`) → `log_notification("new_order_received", …)`.
- `Store::create_new_client()` — `Store.php:650` — canonical guest signup: duplicate-email check via `Users_model`, `Clients_model->ci_save()`, `Users_model->ci_save()` contact (`password_hash(..., PASSWORD_DEFAULT)`, `is_primary_contact=1`, `client_permissions="all"`), `log_notification("client_signup")`, welcome email template `new_client_greetings`.
- `move_files_from_temp_dir_to_permanent_dir()` — `app/Helpers/app_files_helper.php:598` — accepts direct multipart `$_FILES['manualFiles']`; `is_valid_file_to_upload()` enforces `get_setting("accepted_file_formats")` and hard-blocks PHP extensions.
- **CORS reality**: `app/Config/Cors.php` ships with empty `allowedOrigins`; the route-level `['filter' => 'cors']` alone emits nothing usable. The in-repo pattern for API surfaces is manual headers — `mcp_cors_headers()` in `app/Helpers/mcp_helper.php:208`.
- **CSRF reality**: the global CSRF filter is disabled in this fork; `Nabtah::$app_csrf_exclude_uris` (in `app/Config/Nabtah.php`) is appended for convention/forward-compatibility only. Real defenses: bearer tokens, origin allowlist, throttling.
- Token precedent: `rise_mcp_oauth_tokens` (`deploy/migrations/005-mcp-oauth.sql`), validator `mcp_token_user()` (`mcp_helper.php:188`).
- `rise_order_status` seeds: `1 New #f1c40f sort 0`, `2 Processing`, `3 Confirmed`. `get_first_status()` = lowest sort → **"New" must keep sort 0**; new print statuses append after max sort.
- Public pay-link mechanism: `Verification_model` row `type="invoice_payment"`, `code=make_random_string()`, serialized `invoice_id/client_id/contact_id` → URL `pay_invoice/index/{code}`, gated by setting `client_can_pay_invoice_without_login` (pattern at `Invoices.php:1353-1366`, `Pay_invoice.php:15-63`).
- AI-chat/MCP tools: definitions in `hawih_chat_tools()` (`app/Helpers/hawih_chat_helper.php:542`), dispatcher `hawih_chat_dispatch_tool()` (`:1876`). The `/mcp` endpoint re-exposes the same list automatically. **No store/order tools exist yet.**
- Items Excel import (`Items.php`) cannot carry custom fields or images → catalog seeding uses idempotent SQL.
- Custom SQL migrations live in `deploy/migrations/NNN-name.sql` (rise_-prefixed, idempotent), applied to **all tenants** by `_runner.sh` during deploy.

### 1.3 Frontend repo `aaanaji/hawih` (this repo — static HTML brand site)

- Brand tokens `assets/css/hawih.css:8-20`: `--hawih-blue: #1F1FFE` (canonical — README's `#0001fc` is stale), `--hawih-blue-hover: #1414D6`, `--hawih-ink: #0B0B10`, `--hawih-ink-2: #14141C`, `--hawih-paper: #F4F1EB`, `--hawih-paper-2: #E9E4D7`.
- Fonts: **IBM Plex Sans Arabic** (300–700) + **Inter**, via Google Fonts (same `<link>` URL as `hawih.css:35`).
- Logos: `assets/img/logo/hawih-logo-{dark,light,white}.png`, `assets/img/hawih-logo-black.png`, favicon `assets/img/favicon.png`.
- Analytics: **GTM `GTM-N3BWDWG`** (GA4 `G-5HTT49JBJE` + Google Ads `AW-10992465435` configured inside GTM; fires unconditionally per owner decision 2026-06-13). Config: `seo/measurement.yaml`.
- Organization JSON-LD: `seo/jsonld/organization.json`, `@id: https://hawih.com.sa/#organization`; injected by `scripts/inject-jsonld.py`.
- SEO pipeline scripts (`scripts/inject-head.py`, `generate-sitemap.py`, `build-en-mirror.py`, `version-assets.py`) iterate **root `*.html` + `en/` only** — the `print/` directory is invisible to them; no changes needed for safety.
- Deploy: `.github/workflows/deploy.yml` (sshpass + rsync; secrets `SSH_HOST`, `SSH_USER`, `SSH_PASSWORD`, `HAWIH_DOCROOT`; safety gate refuses CodeIgniter docroots). Main-site docroot `/var/www/hawih-site`. The CRM shares the VPS — **never write to its docroot**.
- Cross-brand pattern: dismissible `uc-shfrah-strip` banner — reuse for the print-store strip.

---

## 2. Architecture (committed — build within these decisions)

```
                       ┌──────────────────────────────────────────────┐
   client browser ───▶ │ print.hawih.com.sa  (nginx, /var/www/print-  │
                       │ hawih) — static Astro 5 build, AR + /en/     │
                       └───────────────┬──────────────────────────────┘
                                       │ fetch (CORS, Bearer token)
                                       ▼
                       ┌──────────────────────────────────────────────┐
                       │ crm.hawih.com.sa/index.php/print_api/*       │
                       │ Rise CRM: new Print_api controller           │
                       │ → native rise_orders / order_items / items / │
                       │   invoices / clients / users / files         │
                       │ Admin: existing Rise Orders/Items UI         │
                       │ AI: 5 new chat/MCP store tools               │
                       └──────────────────────────────────────────────┘
```

- **Frontend stack: Astro 5**, `output: 'static'`, `build.format: 'directory'`, **no UI framework** — interactivity via small vanilla TypeScript modules. Rationale: pure static output rsync-able to nginx (no Node on the server; Node 20 runs only in GitHub Actions), `getStaticPaths()` generates real SEO pages per product/category from `catalog.json`, full control of `dir="rtl"`, deterministic file-based routing.
- **Cart lives client-side in localStorage** — checkout is one multipart POST. No server cart, no cookies.
- **Catalog source of truth = CRM Items** (+ item custom fields `print_slug`, `print_options` JSON, `name_en`, `description_en`, `requires_artwork`). Frontend fetches catalog JSON at **build time** (`print/scripts/build-catalog.mjs`), with a committed snapshot fallback; rebuilds nightly (cron) and on demand (workflow_dispatch).
- **Auth: bearer tokens** (`rise_print_api_tokens`, 64-hex, 30-day sliding expiry) issued by `print_api/signup|login`. No cookies → CORS stays credential-less.
- **Tenant safety**: every `print_api` entry point checks `get_setting('print_store_enabled') === '1'` else 404. Default `'0'` everywhere; flipped to `'1'` on the Hawih DB only (runbook §7.1). Shfrah is unaffected.
- **Order lifecycle**: extended `rise_order_status` (Arabic print stages, §Phase 3). Admin manages orders in the existing Rise Orders UI; clients see a status timeline on the store.

---

## 3. Phase graph, ordering, effort

```
P1 Scrape (spec handed to owner's agent) ──→ P2 Demo seed + branded imagery ──┐
P3 CRM backend (push #1: 006+code → ops flip → push #2: 007) ─────────────────┤→ P4 Frontend → P5 SEO → P6 Deploy → P7 QA → LAUNCH
P6.1 DNS/vhost/certbot runbook (parallel, anytime) ───────────────────────────┘        P8 Moyasar (post-launch, keys required)
```

- P4 starts **immediately** against a hand-written `src/data/catalog.json` mock built from the demo seed; swap to live fetch when P3 is deployed.
- Hard sequence inside P3: push #1 (migration 006 + all PHP) → ops flips `print_store_enabled=1` on Hawih → push #2 (migration 007). Both pushes can land the same day.
- Demo-seed SQL (P2) requires migration 007's custom fields to exist first.
- Relative effort: P1 1.0 (external) · P2 1.0 · P3 2.0 · P4 2.5 · P5 0.5 · P6 0.5 · P7 1.0 · P8 1.0. Critical path: P3 → P4 → P7.

---

## Phase 1 — Scrape weej.sa reference dataset

**Fully specified in `print/scrape/SCRAPING-INSTRUCTIONS.md`.** The owner's separate agent is already executing extraction; that document is its instruction spec and defines the **import contract** (`products.json` schema → curation → `hawih-catalog.json` → seed SQL) that Phase 2 and the eventual full import both use. If the owner's dataset arrives in a different shape, normalize it INTO the contract — do not change the contract.

Acceptance (for the full dataset, whenever it lands): ≥300 products with non-empty `name_ar` + `price`; ≥25 categories with ≥1 product; ≥80% of option-bearing products have resolved options; zero scraped images tracked by git; robots verdict recorded.

---

## Phase 2 — Demo seed + Hawih-branded imagery

### 2.1 Demo catalog

`print/reference/seed/hawih-catalog.json` (committed, in this repo) contains 9 demo products across 8 categories with bilingual copy, normalized options, and SAR pricing. It conforms to the import contract. Steps:

1. Write `print/scrape/07_generate_seed_sql.py`: reads `hawih-catalog.json`, emits `print/reference/seed/items-seed.sql` — idempotent SQL only:
   - `INSERT INTO rise_item_categories (title, deleted) SELECT '<name_ar>', 0 WHERE NOT EXISTS (SELECT 1 FROM rise_item_categories WHERE title='<name_ar>' AND deleted=0);`
   - `INSERT INTO rise_items (title, description, unit_type, rate, files, show_in_client_portal, category_id, taxable, sort, deleted) SELECT '<title_ar>', '<description_ar>', '<unit_type>', <rate>, 'a:0:{}', 1, (SELECT id FROM rise_item_categories WHERE title='<cat>' AND deleted=0 LIMIT 1), 0, <n>, 0 WHERE NOT EXISTS (SELECT 1 FROM rise_items WHERE title='<title_ar>' AND deleted=0);`
   - Custom-field values (`print_slug`, `print_options` as JSON string, `name_en`, `description_en`, `requires_artwork`) via `INSERT INTO rise_custom_field_values (related_to_type, related_to_id, custom_field_id, value, deleted) SELECT 'items', i.id, cf.id, '<value>', 0 FROM rise_items i JOIN rise_custom_fields cf ON cf.title='<field>' AND cf.related_to='items' AND cf.deleted=0 WHERE i.title='<title_ar>' AND i.deleted=0 AND NOT EXISTS (SELECT 1 FROM rise_custom_field_values v WHERE v.related_to_type='items' AND v.related_to_id=i.id AND v.custom_field_id=cf.id AND v.deleted=0);`
   - Images are NOT stored in CRM (`files='a:0:{}'`) — storefront imagery lives in this repo under `print/public/img/`.
2. Apply manually to the **Hawih tenant DB only** (runbook §7.1 step 7). Never via `deploy/migrations/` (those run on Shfrah too). Idempotency proof: run twice on a scratch DB → identical row counts.

### 2.2 Branded imagery

Follow `print/brand/style-guide.md` exactly (palette, style, negative constraints, prompt templates). Required assets → `print/public/img/`:

| Asset | Size | Path |
|---|---|---|
| Product hero | 1600×1200 (+800×600 `-sm`) | `img/products/{slug}/hero.webp`, `hero-sm.webp` |
| Product square | 1200×1200 | `img/products/{slug}/square.webp` |
| Category tile | 1200×900 | `img/categories/{slug}.webp` |
| Home hero | 2400×1200 | `img/hero/home.webp` |
| Default OG | 1200×630 | `img/og/default.jpg` |

Post-process with `print/scripts/optimize-images.mjs` (sharp: webp q80, strip metadata, emit `-sm`). **Every image ≤350 KB.**

Acceptance: every seed item has hero + square; every category has a tile; palette spot-check on 10 images; no scraped weej image anywhere under `print/public/`.

---

## Phase 3 — CRM backend

**Fully specified in `docs/print-store-backend-plan.md` in the `aaanaji/CRM` repo** — migrations 006/007 verbatim SQL, `print_api_helper.php` functions, `Print_api.php` endpoint-by-endpoint spec, routes/Nabtah config edits, 5 AI-chat/MCP tools, security rules, curl test suite, Shfrah regression checks, deploy sequencing. Implement it there. Summary of the API contract the frontend depends on:

| Method | Path (`https://crm.hawih.com.sa/index.php/print_api/…`) | Auth | Purpose |
|---|---|---|---|
| GET | `health` | none | liveness |
| GET | `catalog` | none | categories + portal-visible items with parsed options/EN fields |
| GET | `order_statuses` | none | id/title/color/sort for the timeline |
| POST | `signup` | none | create client+contact, return bearer token |
| POST | `login` | none | verify client contact, return bearer token |
| POST | `logout` | Bearer | revoke token |
| GET | `me` | Bearer | contact + client info |
| POST | `checkout` | Bearer or guest | multipart: cart JSON + `manualFiles[]` + guest fields → order (+invoice), returns `order_id`, `token?` |
| GET | `orders` | Bearer | own orders + totals |
| GET | `orders/{id}` | Bearer | ownership-checked detail: items, files, status, invoice `{total, due, pay_url?}` |

Order statuses after migration 007 (append after existing New/Processing/Confirmed; New stays sort 0): مراجعة التصميم `#8e44ad` · معتمد `#2d9cdb` · قيد الطباعة `#1F1FFE` · جاهز للاستلام `#27ae60` · تم الشحن `#16a085` · تم التسليم `#83c340` · معلق `#e67e22` · مرفوض `#e74c3c`.

---

## Phase 4 — Frontend (`print/` in this repo)

### 4.1 Scaffold

```
print/
├── package.json                 # astro@^5, @astrojs/sitemap; devDeps: sharp, typescript
├── astro.config.mjs             # site:'https://print.hawih.com.sa', output:'static',
│                                # build:{format:'directory'}, integrations:[sitemap({filter: drop
│                                # /account, /cart, /checkout, /thank-you, /auth (both locales)})]
├── tsconfig.json
├── .gitignore                   # node_modules/ dist/ .astro/ reference/raw/ reference/images/
├── scripts/
│   ├── build-catalog.mjs        # fetch {API}/catalog → src/data/catalog.json; on network failure
│   │                            # KEEP committed snapshot (warn, exit 0 — never fail the build)
│   └── optimize-images.mjs      # sharp pipeline (§2.2)
├── src/
│   ├── styles/
│   │   ├── tokens.css           # :root copy of hawih.css tokens + store additions (spacing scale,
│   │   │                        # radius, shadows, container widths)
│   │   ├── base.css             # reset; IBM Plex Sans Arabic default; [dir=ltr] Inter; price <bdi>
│   │   └── components.css
│   ├── data/catalog.json        # committed snapshot (bootstrap: generated from ../reference/seed/
│   │                            # hawih-catalog.json shape by a small map — same fields as the API)
│   ├── lib/
│   │   ├── config.ts            # API_BASE='https://crm.hawih.com.sa/index.php/print_api',
│   │   │                        # GTM_ID='GTM-N3BWDWG', WHATSAPP='966502185471', BANK details const
│   │   ├── strings.ts           # ALL UI copy as {ar:string, en:string} map — single i18n source
│   │   ├── api.ts               # typed fetch wrapper; Bearer from localStorage('hawih_print_token');
│   │   │                        # 401 → clear token, redirect to /auth/login/ (locale-aware)
│   │   ├── cart.ts              # localStorage cart [{item_id,slug,title,qty,rate,options:{name:value},
│   │   │                        # note}]; CustomEvent for header badge
│   │   ├── checkout.ts          # FormData: cart JSON, order_note, guest fields, manualFiles[] with
│   │   │                        # per-line artwork_file_names mapping; POST; sessionStorage order →
│   │   │                        # locale thank-you
│   │   └── format.ts            # SAR formatting ('ر.س' / 'SAR'), Arabic date, <bdi> helpers
│   ├── components/              # .astro components:
│   │   #  SEOHead (canonical, og, twitter, hreflang pair), JsonLd, Header (logo, nav, locale switch,
│   │   #  cart badge), Footer (policies, contact, org links, hawih.com.sa link), CategoryTile,
│   │   #  ProductCard, PriceBox, OptionPicker (select/radio per options JSON), QtyTiers,
│   │   #  ArtworkUpload (client script: file input, type/size validation mirroring server rules),
│   │   #  StatusTimeline (order_statuses sorted vs current), Breadcrumbs, EmptyState,
│   │   #  HawihStrip (slim brand strip linking hawih.com.sa — mirror of uc-shfrah-strip)
│   ├── layouts/Base.astro       # <html dir={locale==='ar'?'rtl':'ltr'} lang={locale}>; Google Fonts
│   │                            # preconnect + same URL as hawih.css:35; GTM head + noscript;
│   │                            # favicon; slot
│   └── pages/                   # every page implemented ONCE as a shared component, exported for
│       │                        # both locales (ar at /, en at /en/) via getStaticPaths locale param
│       ├── index.astro
│       ├── category/[slug]/index.astro
│       ├── product/[slug]/index.astro
│       ├── cart/index.astro
│       ├── checkout/index.astro
│       ├── auth/login/index.astro
│       ├── auth/signup/index.astro
│       ├── account/index.astro
│       ├── account/order/index.astro        # CSR: ?id=N → GET orders/N
│       ├── policies/privacy/index.astro
│       ├── policies/terms/index.astro
│       ├── policies/shipping-returns/index.astro
│       ├── thank-you/index.astro            # GTM purchase event; clears cart
│       ├── 404.astro
│       └── en/                              # mirror routes reusing the same shared components
│           └── … (same tree)
└── public/
    ├── robots.txt               # Allow /; Disallow /account/ /cart/ /checkout/ /thank-you/ /auth/
    │                            # + /en/ variants; Sitemap: https://print.hawih.com.sa/sitemap-index.xml
    ├── favicon.png              # copy of ../assets/img/favicon.png
    └── img/                     # logos copied from ../assets/img/logo/; generated products/,
                                 # categories/, hero/, og/
```

### 4.2 Page specs

- **Home**: hero banner (`img/hero/home.webp`, headline in IBM Plex Sans Arabic, cobalt CTA), category grid (8 tiles), featured products (6–8 cards), trust strip (فاتورة ضريبية ZATCA · دفع بالتحويل البنكي · تأكيد عبر واتساب · تنفيذ 3–7 أيام عمل), HawihStrip.
- **Category**: breadcrumbs, tile header, product grid from `catalog.json`, empty state.
- **Product**: gallery (hero + square), title, description, `OptionPicker` per `print_options` (selected options have no price effect in v1 unless the option value carries `price_delta` — then PriceBox recomputes), `QtyTiers` if present, quantity stepper, artwork note ("سترفع ملف التصميم عند إتمام الطلب"), add-to-cart, specs block, related products (same category), JSON-LD Product.
- **Cart**: line items with options summary, per-line note edit, totals (SAR, LTR `<bdi>`), proceed CTA.
- **Checkout**: if token → show `me` info; else guest block (first/last/email/phone/password/company optional) with inline "or login" link; per-line `ArtworkUpload` for items with `requires_artwork` (accept `.jpg,.jpeg,.png,.pdf,.zip,.ai,.eps`, max 25 MB each — mirror server rules; show file chips), `order_note` textarea, order summary, submit → `checkout.ts`. On success store `{order_id, total}` in sessionStorage, save `token` if returned, redirect to thank-you.
- **Thank-you**: order number, "ماذا بعد؟" steps (مراجعة التصميم → تواصل واتساب → الفاتورة في حسابك), bank-transfer instructions block + WhatsApp CTA (`https://wa.me/966502185471?text=` prefilled with order id), GTM `purchase`, clear cart.
- **Account**: orders list (status chips colored by `order_statuses`), link to detail.
- **Order detail**: items table, `StatusTimeline`, uploaded files list, invoice block (total/due; "ادفع الآن" → `pay_url` when present; bank-transfer + WhatsApp otherwise).
- **Auth**: login/signup forms → `api.ts`; on success store token, redirect to `account/` or back to `checkout/`.
- **Policies**: privacy, terms, shipping-returns — Arabic + English body copy (write fresh, Saudi e-commerce basics: execution 3–7 business days, delivery 2–5, revision/cancellation terms).

### 4.3 i18n rules

- All UI chrome strings from `src/lib/strings.ts` `{ar,en}`. Product/category copy from catalog fields (`title`/`name_en`, `description`/`description_en`).
- `/` = `lang="ar" dir="rtl"`; `/en/` = `lang="en" dir="ltr"`. Locale switch in Header preserves the current route.
- Prices always LTR inside `<bdi>`. Phone numbers `dir="ltr"`.
- `SEOHead` emits reciprocal hreflang: `ar-SA` ↔ `en` + `x-default` → Arabic URL.

### 4.4 Acceptance

- `npm run build` succeeds **offline** (snapshot fallback).
- Every catalog item renders `dist/product/{slug}/index.html` AND `dist/en/product/{slug}/index.html` with correct JSON-LD.
- Lighthouse mobile (home, category, product): ≥90 performance, ≥95 SEO, ≥95 accessibility.
- Full E2E vs live CRM: browse → options → cart → guest checkout with PDF artwork → thank-you → account shows order → admin advances status in Rise → timeline updates on refresh.
- RTL audit: no mirrored logos, prices LTR, no bidi breakage in mixed AR/EN strings.

---

## Phase 5 — SEO / analytics / identity

1. **JSON-LD per page** (via `JsonLd.astro`):
   - Home: `OnlineStore` `@id: https://print.hawih.com.sa/#store`, `parentOrganization: {"@id": "https://hawih.com.sa/#organization"}`, `name: "مطبعة هوية"` (EN: "Hawih Print"), logo, `areaServed: "SA"`, `currenciesAccepted: "SAR"`; plus `WebSite`.
   - Category: `CollectionPage` + `ItemList` + `BreadcrumbList`.
   - Product: `Product` (name, absolute image, description, `sku: "HWP-{item_id}"`, `brand: {"@id": "https://hawih.com.sa/#organization"}`, `offers: Offer` price/`SAR`/`InStock`/url) + `BreadcrumbList`.
   - Policies: `WebPage`.
2. **GTM dataLayer events** (GA4 ecommerce shape; container `GTM-N3BWDWG`; tags/triggers configured in the GTM UI as an ops task): `view_item_list` (category), `view_item` (product), `add_to_cart` (cart.ts), `begin_checkout` (checkout load), `purchase` (thank-you: `transaction_id: order_id`, `value`, `currency:'SAR'`, `items`), plus `sign_up`, `login`.
3. **Main-site linkage** (this repo, root pages):
   - Edit `seo/jsonld/organization.json`: add `"owns": {"@type": "OnlineStore", "@id": "https://print.hawih.com.sa/#store", "url": "https://print.hawih.com.sa/", "name": "مطبعة هوية"}` → run `python3 scripts/inject-jsonld.py` (then the standard SEO pipeline before deploy).
   - Add a dismissible top strip "مطبعة هوية — خدمات الطباعة الجديدة" linking to `https://print.hawih.com.sa/?utm_source=hawih&utm_medium=referral&utm_campaign=print-strip` — clone the `uc-shfrah-strip` markup/behavior. **Enable this last (launch switch).**
4. **Search Console**: add property `print.hawih.com.sa`, submit `sitemap-index.xml` (ops task, owner's Google account).

Acceptance: Rich Results test passes for one product + one category URL; sitemap valid; GTM preview shows all 5 ecommerce events with correct payloads; hawih.com.sa organization JSON-LD references the store.

---

## Phase 6 — Deploy & ops

### 6.1 One-time server runbook (manual, root@108.61.89.48)

```bash
# 1. DNS (at the registrar/DNS host): A record  print.hawih.com.sa → 108.61.89.48  (TTL 300)
# 2. Docroot
mkdir -p /var/www/print-hawih && chown www-data:www-data /var/www/print-hawih
# 3. Vhost
cat > /etc/nginx/sites-available/print-hawih <<'EOF'
server {
    listen 80;
    server_name print.hawih.com.sa;
    root /var/www/print-hawih;
    index index.html;

    gzip on; gzip_vary on; gzip_min_length 1024; gzip_comp_level 6;
    gzip_types text/plain text/css text/javascript application/javascript application/json image/svg+xml application/ld+json;

    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    location ~* \.(?:css|js|woff2?|webp|jpg|jpeg|png|svg|ico)$ {
        expires 1y; add_header Cache-Control "public, immutable" always;
    }
    location / {
        try_files $uri $uri/ /404.html;
        add_header Cache-Control "no-cache, must-revalidate" always;
    }
}
EOF
ln -s /etc/nginx/sites-available/print-hawih /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
# 4. TLS (after DNS propagates)
certbot --nginx -d print.hawih.com.sa --redirect -m abdulaziz.naji@gmail.com --agree-tos -n
# 5. CRM vhost upload limits (crm.hawih.com.sa server block ONLY):
#    client_max_body_size 30M;   php.ini: upload_max_filesize=30M post_max_size=32M
nginx -t && systemctl reload nginx && systemctl reload php8.1-fpm
# 6. AFTER CRM push #1 (migration 006) deployed — enable store on Hawih tenant ONLY:
mysql <hawih_db> -e "UPDATE rise_settings SET setting_value='1' WHERE setting_name='print_store_enabled';"
#    → then land CRM push #2 (migration 007).
# 7. AFTER migration 007 — seed the demo catalog on Hawih tenant ONLY:
mysql <hawih_db> < items-seed.sql
# 8. Rise admin checks: Settings → Modules: Orders module ON; email template
#    'order_status_updated' enabled; notification settings for 'new_order_received' on.
```

### 6.2 GitHub Actions (this repo)

Create `.github/workflows/deploy-print.yml`:
- **Triggers**: `push` to `main` with `paths: ["print/**"]`; `workflow_dispatch`; `schedule: cron "0 3 * * *"` (nightly catalog rebuild → picks up Rise item changes within 24 h).
- **Steps**: checkout → `actions/setup-node@v4` node 20 → `npm ci --prefix print` → `node print/scripts/build-catalog.mjs` → `npm run build --prefix print` → skip cleanly if secrets unset → **safety gate** (over SSH): `! test -d "$PRINT_DOCROOT/application" && ! test -f "$PRINT_DOCROOT/system/core/CodeIgniter.php"` AND `[ "$PRINT_DOCROOT" != "/var/www/hawih" ] && [ "$PRINT_DOCROOT" != "/var/www/hawih-site" ]` (allow empty dir — first deploy has no index.html) → backup `tar czf /root/print-hawih-backup-$(date +%s).tgz -C "$PRINT_DOCROOT" .` keep newest 3 → `rsync -az --delete print/dist/ root@$SSH_HOST:$PRINT_DOCROOT/` → `chown -R www-data:www-data`, `find -type f -exec chmod 644`, `-type d -exec chmod 755` → `nginx -t && systemctl reload nginx` → verify `curl -so /dev/null -w '%{http_code}' https://print.hawih.com.sa/` = 200.
- **Secrets**: reuse `SSH_HOST`, `SSH_USER`, `SSH_PASSWORD`; add `PRINT_DOCROOT=/var/www/print-hawih`.

Modify existing `.github/workflows/deploy.yml` (main site): add `print/**` to `paths-ignore` (or path filter) so store commits don't trigger main-site deploys, and add `--exclude='print/'` to its rsync/build-tree step so the store source never lands in `/var/www/hawih-site`.

CRM repo: **no workflow changes** — the existing multi-tenant deploy ships migrations automatically.

Acceptance: first `workflow_dispatch` publishes the site; a price change in Rise Items appears on the store within 24 h; a main-site push does not touch `/var/www/print-hawih` and vice versa; CRM deploy log shows 006 applied on both tenants and 007 no-op on Shfrah (`SELECT COUNT(*) FROM rise_order_status` unchanged there).

---

## Phase 7 — QA & launch checklist

1. **Backend curl suite** (scripted in CRM `docs/print-store-api.md`): every endpoint happy-path + auth failure + throttle 429 + wrong-origin (no CORS header for evil origins; correct header for `https://print.hawih.com.sa`).
2. **Shfrah regression**: `curl https://crm.shfrah.com/index.php/print_api/catalog` → 404 JSON; Shfrah order statuses unchanged; no print custom fields in Shfrah Items UI.
3. **E2E**: guest checkout with 2 items + PDF + PNG artwork → order visible in Rise admin with files and status "New" → advance مراجعة التصميم → قيد الطباعة → تم التسليم → client email on each change → invoice auto-created; pay link opens when `client_can_pay_invoice_without_login` enabled.
4. **Security**: upload `.php`/`.phtml` → rejected; oversize file → rejected; client A token reading client B order → 404; expired/revoked token → 401; SQLi probes on catalog params → parameterized, no effect.
5. **Perf/SEO**: Lighthouse budgets (§4.4); Rich Results pass; Search Console sitemap submitted.
6. **Launch switch**: enable the main-site strip (§5.3) last, after everything above is green.

---

## Phase 8 — Moyasar payment module (deferred; build only when merchant keys exist)

- **Settings** (guarded seeds, default off/empty): `print_moyasar_enabled`, `moyasar_publishable_key`, `moyasar_secret_key` (same plaintext-settings convention as existing Stripe/Paytm keys).
- `app/Libraries/Moyasar.php`: `fetch_payment($payment_id)` → GET `https://api.moyasar.com/v1/payments/{id}`, header `Authorization: Basic base64(secret_key . ':')`.
- `app/Controllers/Moyasar_redirect.php` — **modeled line-for-line on `Stripe_redirect.php`**: `index($verification_code)` → look up pending `Verification_model` row → `fetch_payment()` → verify `status=='paid'` AND `amount == round(invoice_due*100)` (halalas) AND `currency=='SAR'` → duplicate-check by `transaction_id` → `Invoice_payments_model->ci_save()` → `Invoices_model->update_invoice_status()` → `log_notification("invoice_payment_confirmation")` + `("invoice_online_payment_received")` → redirect `pay_invoice/index/{code}`.
- Flow: store "ادفع الآن" → `POST print_api/create_payment {order_id}` → pending row → return Moyasar **hosted payment page** URL with `callback_url=https://crm.hawih.com.sa/index.php/moyasar_redirect/index/{code}` → user pays → server-side verification on redirect. Never trust client-side payment status.
- Config: add `"moyasar_redirect", "moyasar_redirect/index", "moyasar_redirect.*+"` to `Nabtah::$app_csrf_exclude_uris`; guarded migration `008-moyasar.sql` adds the `rise_payment_methods` row ("مدى / بطاقات — Moyasar", online). Activation = paste keys into settings; zero code change.

---

## Risks & guardrails (enforce throughout)

| Risk | Guardrail |
|---|---|
| Shfrah tenant contamination | `print_store_enabled` default `'0'`; every API method gates on it; migration 007 statement-level guards; seed SQL applied manually to Hawih only; QA regression-tests Shfrah explicitly. |
| Copyright of scraped assets | weej images/raw HTML gitignored, never deployed (`print/reference/**` excluded; only `print/dist/` ships); published imagery AI-generated; copy written fresh; provenance manifest kept for audit. |
| Public endpoint abuse | Per-IP throttles (signup 5/hr, login 10/10min, checkout 10/hr, reads 60–120/min); server-side price re-read (never trust cart prices); ownership 404s; 256-bit random tokens. |
| Upload attack surface | Whitelist ∩ Rise `is_valid_file_to_upload()` (PHP extensions hard-blocked); SVG excluded; 25 MB cap + nginx 30M; files stored under CRM `files/` (not web-executed). |
| Token theft via XSS | No third-party JS except GTM; all dynamic DOM via `textContent`/escaped helpers; CSP header on the print vhost is documented optional hardening. |
| Deploy cross-contamination | Separate workflow + docroot + safety gates on both workflows; print workflow hard-refuses CRM/main-site docroots. |
| Payments/legal | v1 has zero card data; invoices via existing Rise + ZATCA `E_invoice`; Moyasar deferred with server-side verification only. |

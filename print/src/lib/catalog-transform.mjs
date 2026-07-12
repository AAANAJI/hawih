/**
 * catalog-transform.mjs — PURE, shared by the build step and the browser.
 *
 * The CRM `print_api/catalog` response has no semantic category slug / English
 * category name, and its options are loosely shaped. This module turns that API
 * shape into the store's canonical catalog shape (matching src/data/catalog.json
 * and the `Catalog` type in catalog.ts).
 *
 * It is imported BOTH by:
 *   - scripts/build-catalog.mjs  (build time → writes the committed snapshot)
 *   - src/lib/live-catalog.ts    (browser → live reconciliation on every visit)
 * so the baked pages and the live-rendered pages are guaranteed identical.
 *
 * MUST stay dependency-free (no node:*, no DOM) so it runs in Node AND the
 * browser bundle.
 */

// Known category Arabic title -> {slug, name_en}. Unknown categories fall back
// to a slugified title. (Categories are few and change rarely; item-level data
// is fully CRM-driven.)
export const CAT_MAP = {
  'ملصقات': { slug: 'stickers', name_en: 'Stickers' },
  'كروت الأعمال': { slug: 'business-cards', name_en: 'Business Cards' },
  'أوراق رسمية': { slug: 'letterhead', name_en: 'Letterhead' },
  'علب وصناديق': { slug: 'boxes', name_en: 'Boxes' },
  'أكياس': { slug: 'bags', name_en: 'Bags' },
  'ورق تغليف': { slug: 'wrapping', name_en: 'Wrapping Paper' },
  'مطبوعات المناسبات': { slug: 'occasions', name_en: 'Occasion Prints' },
  'أظرف': { slug: 'envelopes', name_en: 'Envelopes' },
};

export function slugify(s, fallback) {
  const x = String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return x || fallback;
}

export function normalizeOptions(opts) {
  return (opts || []).map((o) => ({
    name_ar: o.name_ar || o.name || '',
    name_en: o.name_en || '',
    type: o.type === 'tier' ? 'tier' : 'select',
    values: (o.values || []).map((v) => {
      if (typeof v === 'string') return { label_ar: v, label_en: v, price_delta: 0 };
      const label = v.label != null ? v.label : '';
      const out = {
        label_ar: v.label_ar != null ? v.label_ar : label,
        label_en: v.label_en != null ? v.label_en : label || (v.label_ar != null ? v.label_ar : ''),
        price_delta: Number(v.price_delta) || 0,
      };
      // Optional curated extras (configurator cards): recommended ribbon,
      // sublabel, explicit icon key. Only attached when present.
      if (v.recommended === true || v.recommended === 1 || v.recommended === '1') out.recommended = true;
      if (v.sublabel_ar) out.sublabel_ar = String(v.sublabel_ar);
      if (v.sublabel_en) out.sublabel_en = String(v.sublabel_en);
      if (v.icon) out.icon = String(v.icon);
      return out;
    }),
  }));
}

/**
 * Transform the API response into the frontend catalog shape. Pure function
 * (no I/O). Returns { catalog, itemCount }.
 */
export function transformCatalog(api) {
  const apiCats = Array.isArray(api.categories) ? api.categories : [];
  const apiItems = Array.isArray(api.items) ? api.items : [];

  // Map the API category slug ("category-<id>") -> normalized category.
  const catByApiSlug = new Map();
  apiCats.forEach((c, i) => {
    // Precedence: CAT_MAP (curated demo categories) → the CRM-provided slug /
    // English name (set by the bulk importer via print_category_meta) → a
    // slugified Arabic title. The API emits a real slug for imported categories
    // and a 'category-<id>' placeholder otherwise.
    // Tagged (e.g. design-QA) categories ALWAYS keep their own explicit slug —
    // CAT_MAP is bypassed so a QA title can never collide with a real slug
    // (e.g. 'أظرف' → 'envelopes').
    const m = c.tag ? null : CAT_MAP[c.title];
    const apiSlug = typeof c.slug === 'string' && !/^category-\d+$/.test(c.slug) ? c.slug : '';
    catByApiSlug.set(c.slug, {
      id: c.id,
      slug: m ? m.slug : apiSlug || slugify(c.title, 'category-' + c.id),
      title: c.title || '',
      title_en: m ? m.name_en : c.title_en || c.title || '',
      sort: typeof c.sort === 'number' ? c.sort : i,
      // Optional provenance tag (e.g. 'helloprint' for the design-QA catalog),
      // so tagged categories can be filtered out of the real storefront.
      tag: c.tag ? String(c.tag) : '',
      // Optional cut-out category image (transparent PNG) for the tile.
      image: typeof c.image === 'string' ? c.image : '',
    });
  });

  const items = apiItems.map((it) => {
    const cat = catByApiSlug.get(it.category_slug);
    const category_slug = cat ? cat.slug : slugify(it.category_slug, 'category');
    const hasImg = it.image && String(it.image).length > 0;
    return {
      id: it.id,
      slug: it.slug,
      category_slug,
      title: it.title || '',
      title_en: it.title_en || it.title || '',
      description: it.description || '',
      description_en: it.description_en || it.description || '',
      rate: Number(it.rate) || 0,
      currency: it.currency || 'SAR',
      unit_type: it.unit_type || '',
      unit_type_en: it.unit_type || '',
      requires_artwork: !!it.requires_artwork,
      // Per-product lane, already resolved against the global setting by the
      // API: 'range' renders an estimate band, 'exact' a fixed price. Missing
      // (older snapshot/API) falls back to the store-wide mode at render time.
      price_mode: it.price_mode === 'range' ? 'range' : it.price_mode === 'exact' ? 'exact' : '',
      images: hasImg
        ? { hero: it.image, square: it.image }
        : { hero: `/img/products/${it.slug}/hero.svg`, square: `/img/products/${it.slug}/square.svg` },
      options: normalizeOptions(it.options),
      // Provenance tag (e.g. 'helloprint'): carried through so the store can
      // keep design-QA items out of the real listings and toggle them on demand.
      ...(it.tag ? { tag: String(it.tag) } : {}),
    };
  });

  // Keep only categories that actually have products; sort by API order.
  const used = new Set(items.map((i) => i.category_slug));
  const categories = Array.from(catByApiSlug.values())
    .filter((c) => used.has(c.slug))
    .sort((a, b) => a.sort - b.sort)
    .map((c) => ({
      id: c.id,
      slug: c.slug,
      title: c.title,
      title_en: c.title_en,
      sort: c.sort,
      ...(c.tag ? { tag: c.tag } : {}),
      ...(c.image ? { image: c.image } : {}),
    }));

  // Store-wide config from the CRM (settings-driven, no store deploy needed):
  //   price_mode 'exact' → today's behaviour;
  //   price_mode 'range' → vendor-quote mode: prices display as a low–high
  //   range and the final price is confirmed after order review.
  const sc = api.store_config && typeof api.store_config === 'object' ? api.store_config : {};
  const store_config = {
    price_mode: sc.price_mode === 'range' ? 'range' : 'exact',
    range_low_pct: Number(sc.range_low_pct) || 0,
    range_high_pct: Number(sc.range_high_pct) || 0,
  };

  return { catalog: { success: true, store_config, categories, items }, itemCount: items.length };
}

/**
 * Representative image for a category tile: the first product in the category
 * with a real (CRM-hosted) photo, else any product image, else the legacy
 * curated SVG path (exists only for the original demo slugs — CSS provides a
 * designed gradient fallback when even that 404s).
 *
 * Lives HERE so the build-time pages and the browser live-sync renderer
 * (catalog-sync.ts) share one rule by construction.
 */
export function categoryImage(items, slug) {
  const inCat = (items || []).filter((i) => i.category_slug === slug);
  const real = inCat.find((i) => i.images && /^https?:\/\//.test(i.images.square || ''));
  if (real) return real.images.square;
  const any = inCat.find((i) => i.images && i.images.square);
  return any ? any.images.square : `/img/categories/${slug}.svg`;
}

/**
 * catalog-sync.ts — BROWSER-side live catalog reconciliation.
 *
 * The store ships static HTML baked at build time (great for SEO + first
 * paint). This module fetches the LIVE CRM catalog on every visit and
 * re-renders the catalog regions in place, so EVERY detail — product/category
 * names, descriptions, options, which category an item lives in, and
 * add/remove — reflects the CRM within a moment, with no rebuild.
 *
 * It reuses the exact transform the build uses (catalog-transform.mjs via
 * live-catalog.ts), so live pages render identically to baked pages. If the
 * CRM is unreachable the baked HTML simply stands (offline-safe, SEO-safe).
 *
 * Brand-new product/category URLs and the sitemap still come from the daily
 * rebuild; this engine keeps every ALREADY-published surface live.
 *
 * Requires DOM markers set by the pages:
 *   home:     .pk-grid-cats  ·  [data-featured-grid]
 *   category: [data-cat-body]  ·  [data-live-cat-title]  ·  [data-live-cat-count]
 *   product:  [data-product]  + the [data-live-*] hooks below
 */
import { liveCatalog } from './live-catalog';
import { hydrateCardPrices } from './live-prices';
// Plain .mjs module shared with the build script (same rule on both sides).
import { categoryImage } from './catalog-transform.mjs';
import { iconSvg } from './icons';
import { conditionalRefs, optionValueLabel, optionValueSub, optionGroupLabel } from './options';
import { optionIcon, formatDelta } from './option-visuals';
import type { Catalog, CatalogCategory, CatalogItem, StoreConfig } from './catalog';
import { formatCardPrice, formatNumber, itemPriceCfg, type Locale } from './format';
import { href } from './i18n';
import { t } from './strings';

function currentLocale(): Locale {
  return typeof document !== 'undefined' && document.documentElement.lang === 'en' ? 'en' : 'ar';
}
const catTitle = (c: CatalogCategory, l: Locale) => (l === 'ar' ? c.title : c.title_en) || c.title;
const itemTitle = (i: CatalogItem, l: Locale) => (l === 'ar' ? i.title : i.title_en) || i.title;
const itemDesc = (i: CatalogItem, l: Locale) => (l === 'ar' ? i.description : i.description_en) || i.description;
const itemUnit = (i: CatalogItem, l: Locale) => (l === 'ar' ? i.unit_type : i.unit_type_en ?? i.unit_type) || '';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text != null) node.textContent = text;
  return node;
}

/* ---------------------------------------------------------------- renderers */

function renderProductCard(
  item: CatalogItem,
  categoryLabel: string,
  locale: Locale,
  cfg?: StoreConfig,
  badge = '',
  fastChip = false,
): HTMLAnchorElement {
  // MUST mirror ProductCard.astro (badge on the media tile, big price, chip).
  const a = el('a', { class: 'pk-prodcard', href: href(locale, `/product/${item.slug}`) });

  const media = el('div', { class: 'pk-prodcard__media' });
  if (badge) media.appendChild(el('span', { class: 'pk-prodcard__badge' }, badge));
  const img = el('img', {
    src: item.images?.square ?? '',
    alt: itemTitle(item, locale),
    loading: 'lazy',
    decoding: 'async',
    width: '1200',
    height: '1200',
    'data-live-image': '',
    'data-slug': item.slug,
  });
  // Mirrors ProductCard.astro's onerror fallback.
  img.addEventListener('error', () => {
    img.style.visibility = 'hidden';
  });
  media.appendChild(img);

  const body = el('div', { class: 'pk-prodcard__body' });
  if (categoryLabel) body.appendChild(el('span', { class: 'pk-prodcard__tag' }, categoryLabel));
  body.appendChild(el('h3', { class: 'pk-prodcard__title' }, itemTitle(item, locale)));

  const price = el('div', { class: 'pk-prodcard__price pk-price' });
  price.appendChild(el('span', { class: 'pk-from' }, t('product.startingFrom', locale)));
  // Same card rule as ProductCard.astro: range mode (per item) → low bound.
  price.appendChild(
    el('bdi', { 'data-live-price': '', 'data-slug': item.slug },
      formatCardPrice(item.rate, itemPriceCfg(cfg, item.price_mode), locale)),
  );
  body.appendChild(price);

  if (fastChip) {
    const chip = el('span', { class: 'pk-prodcard__fast' });
    chip.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 3 14h7l-1 8 10-12h-7z"/></svg>';
    chip.append(t('badge.fast', locale));
    body.appendChild(chip);
  }

  a.append(media, body);
  return a;
}

function renderCategoryTile(
  cat: CatalogCategory,
  locale: Locale,
  eager: boolean,
  imageSrc: string,
): HTMLAnchorElement {
  // MUST mirror CategoryTile.astro (imageSrc = shared categoryImage() rule).
  const title = catTitle(cat, locale);
  const a = el('a', { class: 'pk-cattile', href: href(locale, `/category/${cat.slug}`), 'aria-label': title });
  a.appendChild(el('span', { class: 'pk-cattile__label' }, title));
  const img = el('img', {
    src: imageSrc,
    alt: title,
    loading: eager ? 'eager' : 'lazy',
    decoding: 'async',
    width: '1200',
    height: '900',
  });
  // Failed image hides itself — the white card + label keep it intentional
  // (same behavior as the baked onerror handler).
  img.addEventListener('error', () => {
    img.style.visibility = 'hidden';
  });
  a.appendChild(img);
  const arrow = el('span', { class: 'pk-cattile__arrow', 'aria-hidden': 'true' });
  arrow.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  a.appendChild(arrow);
  return a;
}

/** Rebuild an OptionPicker's dropdowns from live options (matches OptionPicker.astro). */
function renderOptions(picker: Element, options: CatalogItem['options'], locale: Locale): void {
  const refs = conditionalRefs(options);
  picker.textContent = '';
  options.forEach((o, gi) => {
    const ref = refs[gi];
    const attrs: Record<string, string> = {
      class: 'pk-optgroup',
      'data-option-name': o.name_ar,
      'data-option-name-ar': o.name_ar,
      'data-option-type': o.type,
    };
    if (ref) {
      attrs['data-cond-group'] = ref.group;
      attrs['data-cond-value'] = ref.value;
    }
    const wrap = el('div', attrs);
    if (ref) {
      const controller = options.find((c) => c.name_ar === ref.group);
      wrap.hidden = !controller || (controller.values[0]?.label_ar ?? '') !== ref.value;
    }
    // Visual configurator cards — MUST mirror OptionPicker.astro exactly
    // (icons come from the SHARED option-visuals module, so they can't drift).
    const legend = el('div', { class: 'pk-optgroup__legend' });
    legend.append(optionGroupLabel(o, locale) + ': ');
    legend.appendChild(
      el('b', { 'data-opt-current': '' }, optionValueLabel(o.values[0] ?? { label_ar: '', label_en: '', price_delta: 0 }, locale)),
    );
    const cards = el('div', { class: 'pk-optcards', role: 'radiogroup', 'aria-label': optionGroupLabel(o, locale) });
    o.values.forEach((v, vi) => {
      const label = optionValueLabel(v, locale);
      const sub = optionValueSub(v, locale);
      const delta = formatDelta(v.price_delta, locale);
      const card = el('label', { class: 'pk-optcard' });
      const input = el('input', {
        type: 'radio',
        name: `opt-${gi}`,
        value: v.label_ar,
        'data-delta': String(v.price_delta),
        'data-text': label,
      });
      if (vi === 0) input.setAttribute('checked', '');
      card.appendChild(input);
      const icon = el('span', { class: 'pk-optcard__icon' });
      icon.innerHTML = optionIcon(v.label_ar, v.label_en, v.icon ?? '');
      card.appendChild(icon);
      card.appendChild(el('span', { class: 'pk-optcard__label' }, label));
      if (sub) card.appendChild(el('span', { class: 'pk-optcard__sub' }, sub));
      if (delta) {
        const chip = el('span', { class: 'pk-optcard__delta pk-price' });
        chip.appendChild(el('bdi', {}, delta));
        card.appendChild(chip);
      }
      if (v.recommended) card.appendChild(el('span', { class: 'pk-optcard__rec' }, t('pdp.recommended', locale)));
      cards.appendChild(card);
    });
    wrap.append(legend, cards);
    picker.appendChild(wrap);
  });
}

/* -------------------------------------------------------------- reconcilers */

function reconcileHome(cat: Catalog, locale: Locale): void {
  const catsGrid = document.querySelector('.pk-grid-cats');
  if (catsGrid) {
    catsGrid.textContent = '';
    cat.categories.forEach((c, i) => {
      const wrap = el('div', { class: 'pk-reveal is-visible' });
      wrap.appendChild(renderCategoryTile(c, locale, i < 4, categoryImage(cat.items, c.slug)));
      catsGrid.appendChild(wrap);
    });
  }

  const featGrid = document.querySelector('[data-featured-grid]');
  if (featGrid) {
    const byCat = new Map(cat.categories.map((c) => [c.slug, c]));
    featGrid.textContent = '';
    // Slice size MUST match `featured` in index.astro.
    cat.items.slice(0, 8).forEach((it) => {
      const c = byCat.get(it.category_slug);
      const wrap = el('div', {
        class: 'pk-reveal is-visible',
        'data-product-id': String(it.id),
        'data-product-name': itemTitle(it, locale),
        'data-product-price': String(it.rate),
        'data-product-cat': it.category_slug,
      });
      wrap.appendChild(renderProductCard(it, c ? catTitle(c, locale) : '', locale, cat.store_config, '', true));
      featGrid.appendChild(wrap);
    });
  }
}

function reconcileCategory(cat: Catalog, locale: Locale, slug: string): void {
  const category = cat.categories.find((c) => c.slug === slug);
  const products = cat.items.filter((i) => i.category_slug === slug);
  const label = category ? catTitle(category, locale) : '';

  const titleEl = document.querySelector('[data-live-cat-title]');
  if (titleEl && label) titleEl.textContent = label;
  const countEl = document.querySelector('[data-live-cat-count]');
  if (countEl) countEl.textContent = `${formatNumber(products.length, locale)} ${t('category.productsCount', locale)}`;

  const body = document.querySelector('[data-cat-body]');
  if (!body) return;
  body.textContent = '';
  if (products.length) {
    const grid = el('div', { class: 'pk-grid-products', 'data-cat-grid': '' });
    grid.style.marginBottom = 'var(--sp-10)';
    products.forEach((p, i) => {
      const wrap = el('div', {
        'data-product-id': String(p.id),
        'data-product-name': itemTitle(p, locale),
        'data-product-price': String(p.rate),
      });
      // Badge rule MUST match category/[slug].astro.
      const badge = i < 2 ? t('badge.popular', locale) : p.requires_artwork ? t('badge.upload', locale) : '';
      wrap.appendChild(renderProductCard(p, label, locale, cat.store_config, badge, true));
      grid.appendChild(wrap);
    });
    body.appendChild(grid);
  } else {
    // Matches EmptyState.astro markup.
    const empty = el('div');
    empty.style.marginBottom = 'var(--sp-10)';
    const inner = el('div', { class: 'pk-empty' });
    const icon = el('div', { class: 'pk-empty__icon', 'aria-hidden': 'true' });
    icon.innerHTML = iconSvg('folder');
    inner.appendChild(icon);
    inner.appendChild(el('h2', { class: 'pk-h2' }, t('category.empty.title', locale)));
    inner.appendChild(el('p', {}, t('category.empty.body', locale)));
    inner.appendChild(el('a', { class: 'pk-btn', href: href(locale, '/') }, t('common.backHome', locale)));
    empty.appendChild(inner);
    body.appendChild(empty);
  }
}

function reconcileProduct(cat: Catalog, locale: Locale, root: HTMLElement): void {
  const slug = root.dataset.slug || '';
  const item = cat.items.find((i) => i.slug === slug);
  if (!item) return; // removed items are dropped by the daily rebuild
  const category = cat.categories.find((c) => c.slug === item.category_slug);
  const label = category ? catTitle(category, locale) : '';
  const title = itemTitle(item, locale);
  const desc = itemDesc(item, locale);

  const setText = (sel: string, txt: string, scope: ParentNode = document) => {
    const node = scope.querySelector(sel);
    if (node && txt) node.textContent = txt;
  };

  setText('[data-live-prod-title]', title);
  setText('[data-live-prod-desc]', desc);
  root.querySelectorAll('[data-live-prod-tag]').forEach((n) => { if (label) n.textContent = label; });
  setText('[data-live-spec-cat]', label);
  setText('[data-live-spec-unit]', itemUnit(item, locale));

  // Breadcrumb: [ home(a) · category(a) · title(current) ] — target structurally
  // so the shared Breadcrumbs component needs no per-page hooks.
  const crumbCat = document.querySelector('.pk-breadcrumbs a:nth-of-type(2)') as HTMLAnchorElement | null;
  if (crumbCat && label) {
    crumbCat.textContent = label;
    if (category) crumbCat.setAttribute('href', href(locale, `/category/${category.slug}`));
  }
  const crumbTitle = document.querySelector('.pk-breadcrumbs [aria-current="page"]');
  if (crumbTitle && title) crumbTitle.textContent = title;

  // Live base price → the inline buy-box script recomputes from data-base.
  root.dataset.base = String(item.rate);
  // Per-item price lane too (spec 013 R-9) — the buy-box reads data-price-mode.
  root.dataset.priceMode = item.price_mode === 'range' || item.price_mode === 'exact' ? item.price_mode : '';
  const priceEl = root.querySelector<HTMLElement>('[data-pricebox-amount]');
  if (priceEl) priceEl.dataset.base = String(item.rate);

  // Hero + first thumbnail from the CRM-managed image.
  const heroSrc = item.images?.hero;
  if (heroSrc) {
    const hero = document.querySelector<HTMLImageElement>('#pdp-hero');
    if (hero) hero.src = heroSrc;
    const firstThumb = document.querySelector<HTMLElement>('[data-thumb]');
    if (firstThumb) {
      firstThumb.dataset.thumb = heroSrc;
      const timg = firstThumb.querySelector('img');
      if (timg) (timg as HTMLImageElement).src = heroSrc;
    }
    root.dataset.image = heroSrc;
  }

  // Rebuild the options group (structure + labels + deltas), then reprice.
  const picker = root.querySelector('.pk-optpicker');
  if (picker) renderOptions(picker, item.options, locale);

  // Tell the buy-box script to recompute the price from the new base/deltas.
  root.dispatchEvent(new CustomEvent('pk:reprice'));
}

/* -------------------------------------------------------------------- entry */

function pageNeedsSync(): boolean {
  return !!(
    document.querySelector('.pk-grid-cats') ||
    document.querySelector('[data-featured-grid]') ||
    document.querySelector('[data-cat-body]') ||
    document.querySelector('[data-product]') ||
    document.querySelector('[data-live-price]') ||
    document.querySelector('[data-live-image]')
  );
}

/** Reconcile the current page against the live CRM catalog. Never throws. */
export async function catalogSync(): Promise<void> {
  if (typeof document === 'undefined') return;
  if (!pageNeedsSync()) return;

  const cat = await liveCatalog();
  if (cat) {
    const locale = currentLocale();
    const path = location.pathname;
    try {
      if (/^\/(?:en\/?)?$/.test(path)) reconcileHome(cat, locale);
    } catch { /* keep baked */ }
    try {
      const m = path.match(/^\/(?:en\/)?category\/([^/]+)\/?$/);
      if (m) reconcileCategory(cat, locale, decodeURIComponent(m[1]));
    } catch { /* keep baked */ }
    try {
      const root = document.querySelector<HTMLElement>('[data-product]');
      if (root) reconcileProduct(cat, locale, root);
    } catch { /* keep baked */ }
  }

  // Refresh any remaining price/image cards (e.g. related products) + belt-and-
  // suspenders for grids rendered above.
  await hydrateCardPrices();
}

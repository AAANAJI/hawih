/**
 * i18n.ts — locale routing conventions for pages/components.
 *
 * ROUTING CONVENTION
 * ------------------
 * Arabic (default) lives at the root:      /            , /category/stickers/
 * English mirror lives under /en/:         /en/         , /en/category/stickers/
 *
 * Every localized route is implemented ONCE as a [locale] dynamic segment,
 * e.g. src/pages/[locale]/category/[slug].astro, with getStaticPaths emitting
 * both locales. The Arabic pages are ALSO reachable at the bare root because
 * we additionally map locale '' (empty) — see localizedPaths() below.
 *
 * To add a NEW localized page:
 *   1. create src/pages/[locale]/my-page.astro
 *   2. export const getStaticPaths = () => localeStaticPaths();
 *   3. read `const { locale } = Astro.params` and normalize via toLocale()
 *   4. build hrefs with `href(locale, '/my-page')`
 */
import type { Locale } from './format';

export const LOCALES: Locale[] = ['ar', 'en'];
export const DEFAULT_LOCALE: Locale = 'ar';

/**
 * getStaticPaths param values. Arabic is emitted as 'ar' but the physical
 * route param is empty-string so it renders at the root; English uses 'en'.
 * Astro maps `[locale]` = '' -> root and 'en' -> /en/.
 */
export function localeStaticPaths() {
  return [
    { params: { locale: undefined }, props: { locale: 'ar' as Locale } },
    { params: { locale: 'en' }, props: { locale: 'en' as Locale } },
  ];
}

/** Normalize a raw [locale] param ('en' | undefined) to a Locale. */
export function toLocale(param: string | undefined): Locale {
  return param === 'en' ? 'en' : 'ar';
}

/** Build a locale-aware href from a root-relative path (leading slash). */
export function href(locale: Locale, path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  const withSlash = clean === '/' ? '/' : clean.endsWith('/') ? clean : `${clean}/`;
  if (locale === 'en') {
    return withSlash === '/' ? '/en/' : `/en${withSlash}`;
  }
  return withSlash;
}

/** dir + lang attributes for a locale. */
export function dirFor(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

/** Given the current path, produce the equivalent path in the other locale. */
export function switchLocalePath(currentPath: string, target: Locale): string {
  // Strip any /en prefix to get the canonical Arabic path.
  let base = currentPath.replace(/^\/en(\/|$)/, '/');
  if (!base.startsWith('/')) base = `/${base}`;
  return href(target, base);
}

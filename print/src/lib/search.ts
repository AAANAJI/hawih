/**
 * search.ts — shared client-side product matching for the hero SearchBox and
 * the /products page filter. Arabic-aware normalization, no dependencies.
 */

/** Lowercase + strip Arabic diacritics/tatweel + normalize letter variants. */
export function normalizeText(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/[ً-ْٰـ]/g, '') // tashkeel, dagger alif, tatweel
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
}

export interface SearchEntry {
  /** product slug */
  s: string;
  /** Arabic title */
  t: string;
  /** English title */
  e: string;
  /** category slug */
  c: string;
  /** base rate */
  p: number;
  /** square image url */
  i: string;
}

/**
 * Relevance score for a normalized query against an entry.
 * prefix (3) > word-start (2) > substring (1); other-locale matches −0.5.
 * 0 = no match.
 */
export function matchScore(nq: string, entry: SearchEntry, locale: 'ar' | 'en'): number {
  const primary = normalizeText(locale === 'ar' ? entry.t : entry.e);
  const secondary = normalizeText(locale === 'ar' ? entry.e : entry.t);
  const tier = (hay: string): number => {
    if (!hay || !nq) return 0;
    if (hay.startsWith(nq)) return 3;
    if (hay.includes(' ' + nq)) return 2;
    if (hay.includes(nq)) return 1;
    return 0;
  };
  const a = tier(primary);
  const b = tier(secondary);
  return Math.max(a, b > 0 ? b - 0.5 : 0);
}

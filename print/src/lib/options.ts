/**
 * options.ts — shared product-option logic (server render + live-sync mirror
 * + product-page script all import from HERE so behavior can never drift).
 *
 * CONDITIONAL GROUPS (the weej model): some products carry one quantity group
 * PER size — e.g. selector group "مقاس الاستيكر" with values "4 سم"…"10 سم",
 * plus groups named "4سم", "5سم", …, "8", "10 سم" whose values are quantities
 * (250/500/1000) with price deltas. Only the group matching the selector's
 * chosen value should be visible and counted in the price; rendering all of
 * them (each with a default selection) over-computes the price.
 *
 * Detection: group G is conditional on controller C=v when
 * normOptKey(G.name) === normOptKey(v) for some value v of another group C.
 * normOptKey strips whitespace and the unit word (سم/cm), so
 * "4سم" ↔ "4 سم" and "8" ↔ "8 سم" match. Products without this pattern get
 * no conditional refs and render every group (unchanged behavior).
 */
import { formatSAR, type Locale } from './format';

interface OptValue {
  label_ar: string;
  label_en: string;
  price_delta: number;
}
export interface OptGroup {
  name_ar: string;
  name_en: string;
  type: string;
  values: OptValue[];
}

/** Reference to the controlling group+value a conditional group depends on. */
export interface CondRef {
  group: string; // controller group name_ar
  value: string; // controller value label_ar
}

/** Normalize an option token for matching: no spaces, no unit word. */
export function normOptKey(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/سم|cm/gi, '')
    .replace(/\s+/g, '')
    .trim();
}

/**
 * For each group, the controller (group,value) it is conditional on — or null.
 * Aligned by index with `options`.
 */
export function conditionalRefs(options: OptGroup[]): (CondRef | null)[] {
  return options.map((g, gi) => {
    const gKey = normOptKey(g.name_ar);
    if (!gKey) return null;
    for (let ci = 0; ci < options.length; ci++) {
      if (ci === gi) continue;
      const c = options[ci];
      const hit = (c.values || []).find((v) => normOptKey(v.label_ar) === gKey);
      if (hit) return { group: c.name_ar, value: hit.label_ar };
    }
    return null;
  });
}

/** Display text for a <option>: localized label + "(+N ر.س)" when surcharged. */
export function optionValueText(v: OptValue, locale: Locale): string {
  const label = (locale === 'ar' ? v.label_ar || v.label_en : v.label_en || v.label_ar) || '';
  return v.price_delta > 0 ? `${label} (+${formatSAR(v.price_delta, locale)})` : label;
}

/** Localized group label. */
export function optionGroupLabel(g: OptGroup, locale: Locale): string {
  return (locale === 'ar' ? g.name_ar || g.name_en : g.name_en || g.name_ar) || '';
}

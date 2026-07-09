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

/** Family key for duplicate-name detection: punctuation/asterisks collapsed
 *  ("الكمية المطلوبة *" and "الكمية المطلوبة **" are one family). */
function famKey(s: string): string {
  return String(s || '')
    .toLowerCase()
    .replace(/[*؟?!.:\-_]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Number tokens inside a label ("40 50x سم" → ['40','50']). */
function numTokens(s: string): string[] {
  return String(s || '').match(/\d+(?:\.\d+)?/g) ?? [];
}

/**
 * For each group, the controller (group,value) it is conditional on — or null.
 * Aligned by index with `options`. Two linkage patterns (both observed in the
 * scraped weej/Salla data):
 *
 * 1. NAME-LINKED: the dependent group is NAMED like a controller value
 *    (group "8" ↔ value "8 سم").
 * 2. ORDER-LINKED FAMILIES: several groups share one repeated name (e.g. four
 *    "كمية استيكر الغطاء" groups — possibly interleaved with other groups) and
 *    map, in document order, to the values of the nearest PRECEDING
 *    non-duplicate group with at least that many values (its extra values —
 *    e.g. "لا أرغب" — simply have no dependent, so choosing them shows no
 *    quantity group and adds nothing).
 *
 * Groups matching neither pattern stay unconditional (always visible) —
 * ordinary additive extras like lamination/punching keep summing, as on weej.
 */
export function conditionalRefs(options: OptGroup[]): (CondRef | null)[] {
  const refs: (CondRef | null)[] = options.map(() => null);

  // Pass 1 — name-linked.
  options.forEach((g, gi) => {
    const gKey = normOptKey(g.name_ar);
    if (!gKey) return;
    for (let ci = 0; ci < options.length; ci++) {
      if (ci === gi) continue;
      const c = options[ci];
      const hit = (c.values || []).find((v) => normOptKey(v.label_ar) === gKey);
      if (hit) {
        refs[gi] = { group: c.name_ar, value: hit.label_ar };
        return;
      }
    }
  });

  // Pass 2 — order-linked duplicate-name families among the still-unmatched
  // (family key ignores punctuation, so "الكمية *" and "الكمية **" are one
  // family; members may be interleaved with other groups).
  const families = new Map<string, number[]>();
  options.forEach((g, gi) => {
    if (refs[gi]) return;
    const key = famKey(g.name_ar);
    const list = families.get(key) ?? [];
    list.push(gi);
    families.set(key, list);
  });
  families.forEach((idxs, key) => {
    if (idxs.length < 2) return;
    // Controller: nearest group BEFORE the family's first member that is not a
    // dependent, not part of a duplicate family, with enough values.
    let ctrl = -1;
    for (let ci = idxs[0] - 1; ci >= 0; ci--) {
      if (refs[ci]) continue;
      const cKey = famKey(options[ci].name_ar);
      if (cKey === key || (families.get(cKey)?.length ?? 0) >= 2) continue;
      if ((options[ci].values || []).length >= idxs.length) { ctrl = ci; break; }
    }
    if (ctrl < 0) return;
    idxs.forEach((gi, t) => {
      refs[gi] = { group: options[ctrl].name_ar, value: options[ctrl].values[t].label_ar };
    });
  });

  // Pass 3 — number-paired siblings: ≥2 unmatched groups whose names each
  // contain exactly ONE distinct number (e.g. "استاند خشبي مقاس 40 سم ؟"),
  // paired to the values of a preceding controller by that number (prefer the
  // value whose FIRST number matches; else a unique any-position match). Only
  // applied when EVERY sibling pairs to a DISTINCT value — a safety condition
  // that makes false positives very unlikely.
  {
    const cand = options
      .map((g, gi) => ({ gi, ns: numTokens(g.name_ar) }))
      .filter((x) => !refs[x.gi] && x.ns.length === 1);
    const byN = new Map<string, number[]>();
    cand.forEach((x) => {
      const list = byN.get(x.ns[0]) ?? [];
      list.push(x.gi);
      byN.set(x.ns[0], list);
    });
    if (cand.length >= 2 && byN.size >= 2 && [...byN.values()].every((v) => v.length === 1)) {
      const first = Math.min(...cand.map((x) => x.gi));
      const candSet = new Set(cand.map((x) => x.gi));
      for (let ci = first - 1; ci >= 0; ci--) {
        if (refs[ci] || candSet.has(ci)) continue;
        const vals = options[ci].values || [];
        const pairs = new Map<number, string>();
        let ok = true;
        byN.forEach((gis, N) => {
          if (!ok) return;
          const firsts = vals.filter((v) => numTokens(v.label_ar)[0] === N);
          const anys = vals.filter((v) => numTokens(v.label_ar).includes(N));
          const pick = firsts.length === 1 ? firsts[0] : anys.length === 1 ? anys[0] : null;
          if (!pick) { ok = false; return; }
          pairs.set(gis[0], pick.label_ar);
        });
        const distinct = new Set([...pairs.values()]);
        if (ok && pairs.size >= 2 && distinct.size === pairs.size) {
          pairs.forEach((valueLabel, gi) => {
            refs[gi] = { group: options[ci].name_ar, value: valueLabel };
          });
          break;
        }
      }
    }
  }

  return refs;
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

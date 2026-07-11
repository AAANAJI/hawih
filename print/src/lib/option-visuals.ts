/**
 * option-visuals.ts — THE single source for the visual option-card icons
 * (HelloPrint-style configurator). Imported by BOTH OptionPicker.astro (SSR)
 * and catalog-sync.ts renderOptions() (browser), so the baked page and the
 * live-CRM rebuild can never drift apart on icon logic.
 *
 * optionIcon() derives a deterministic inline SVG from the value's label:
 *   - dimension labels ("9×5", "٩٠×٥٠", "85 x 55 مم") → a proportional
 *     rectangle diagram (their signature size cards);
 *   - paper weights ("300 جرام", "350gsm") → a paper-sheet glyph with a fold;
 *   - finishes (لامع/مط/لامينيشن/UV/gloss/matt) → sheen / flat glyphs;
 *   - foil (ذهبي/فضي/foil) → a sparkle;
 *   - sides (وجه واحد/وجهين/single/double) → one or two stacked sheets;
 *   - fallback → a quiet dot, so every card still reads as a card.
 *
 * Everything is currentColor so CSS controls the tint (muted → accent when
 * the card is selected).
 */

const SVG_OPEN =
  '<svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">';

/** Convert Arabic-Indic digits to ASCII so one regex handles both. */
function normalizeDigits(s: string): string {
  return s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

/** Extract "W×H" from a label in either digit system ("85×55", "٩٠ x ٥٠"). */
function parseDims(label: string): { w: number; h: number } | null {
  const m = normalizeDigits(label).match(/(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)/i);
  if (!m) return null;
  const w = parseFloat(m[1]);
  const h = parseFloat(m[2]);
  if (!(w > 0) || !(h > 0)) return null;
  return { w, h };
}

function rectIcon(w: number, h: number): string {
  // Fit the W×H aspect into a 34×30 box centered in the 48 viewBox.
  const maxW = 34;
  const maxH = 30;
  const scale = Math.min(maxW / w, maxH / h);
  const rw = Math.max(10, w * scale);
  const rh = Math.max(8, h * scale);
  const x = (48 - rw) / 2;
  const y = (48 - rh) / 2;
  return `${SVG_OPEN}<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}" rx="2"/></svg>`;
}

const SHEET = `${SVG_OPEN}<path d="M14 8h14l8 8v24H14z"/><path d="M28 8v8h8"/></svg>`;
const SHEETS_2 = `${SVG_OPEN}<rect x="10" y="14" width="22" height="26" rx="2"/><path d="M16 8h14l8 8v18" opacity=".55"/></svg>`;
const SHEET_1 = `${SVG_OPEN}<rect x="14" y="9" width="20" height="30" rx="2"/><path d="M19 17h10M19 23h10M19 29h6"/></svg>`;
const GLOSS = `${SVG_OPEN}<rect x="10" y="12" width="28" height="24" rx="2"/><path d="M16 30 30 16" opacity=".9"/><path d="M22 32 34 20" opacity=".45"/></svg>`;
const MATT = `${SVG_OPEN}<rect x="10" y="12" width="28" height="24" rx="2"/><path d="M16 20h16M16 26h16" opacity=".4"/></svg>`;
const LAMINATE = `${SVG_OPEN}<rect x="10" y="14" width="24" height="24" rx="2"/><path d="M34 30c4-1 6-4 6-8 0-6-5-10-11-10" opacity=".6"/><path d="M34 24l4 6h-8z"/></svg>`;
const SPARKLE = `${SVG_OPEN}<path d="M24 10l3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/><path d="M36 30l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" opacity=".6"/></svg>`;
const ROUNDED = `${SVG_OPEN}<rect x="10" y="14" width="28" height="20" rx="7"/></svg>`;
const STRAIGHT = `${SVG_OPEN}<rect x="10" y="14" width="28" height="20"/></svg>`;
const NONE_ICON = `${SVG_OPEN}<circle cx="24" cy="24" r="14"/><path d="M14 34 34 14"/></svg>`;
const DOT = `${SVG_OPEN}<circle cx="24" cy="24" r="5" fill="currentColor" stroke="none"/></svg>`;

/**
 * Deterministic icon for one option value. `iconKey` (optional per-value
 * override curated in the CRM print_options JSON) wins over label inference.
 */
export function optionIcon(labelAr: string, labelEn = '', iconKey = ''): string {
  const explicit = (iconKey || '').trim().toLowerCase();
  const KNOWN: Record<string, string> = {
    sheet: SHEET, gloss: GLOSS, matt: MATT, laminate: LAMINATE, foil: SPARKLE,
    single: SHEET_1, double: SHEETS_2, rounded: ROUNDED, straight: STRAIGHT,
    none: NONE_ICON, dot: DOT,
  };
  if (explicit && KNOWN[explicit]) return KNOWN[explicit];

  const label = `${labelAr} ${labelEn}`;
  const dims = parseDims(label);
  if (dims) return rectIcon(dims.w, dims.h);

  const l = label.toLowerCase();
  if (/جرام|غرام|gsm|جم\b/.test(l)) return SHEET;
  if (/بدون|لا شيء|none|no /.test(l)) return NONE_ICON;
  if (/لامينيشن|تغليف حراري|laminat|سيلوفان/.test(l)) return LAMINATE;
  if (/لامع|جلوسي|gloss|uv/.test(l)) return GLOSS;
  if (/مطفي|مط\b|مطفى|matt|matte/.test(l)) return MATT;
  if (/ذهبي|فضي|فويل|foil|gold|silver/.test(l)) return SPARKLE;
  if (/وجهين|الوجهين|double|وجهان/.test(l)) return SHEETS_2;
  if (/وجه واحد|single/.test(l)) return SHEET_1;
  if (/دائري|مدور|مستدير|rounded/.test(l)) return ROUNDED;
  if (/حاد|مستقيم|straight|square/.test(l)) return STRAIGHT;
  return DOT;
}

/** "+١٥ ر.س" / "+SAR 15" delta chip text ('' when no positive delta). */
export function formatDelta(delta: number, locale: 'ar' | 'en'): string {
  if (!(delta > 0)) return '';
  const nf = new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return locale === 'ar' ? `+${nf.format(delta)} ر.س` : `+SAR ${nf.format(delta)}`;
}

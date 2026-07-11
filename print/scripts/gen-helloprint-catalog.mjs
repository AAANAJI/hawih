#!/usr/bin/env node
/**
 * gen-helloprint-catalog.mjs — generate the HelloPrint DESIGN-QA catalog.
 *
 * Produces a faithful, HelloPrint-modelled catalog (categories, products,
 * options, prices, generic images) for design/QA comparison ONLY — every item
 * carries tag "helloprint" so it can be selected/managed/removed in bulk and is
 * kept out of the real storefront listings. Prices are realistic SAR figures
 * (HelloPrint's live prices come from a dynamic per-quantity calculator and are
 * not exposed); images are clean generic SVG tiles (HelloPrint itself uses
 * generic stock imagery).
 *
 * Category taxonomy + product option structures are modelled on the live
 * helloprint.com catalog (Promotional Prints, Stationery & Office, Signage &
 * Outdoor, Stickers & Labels, Packaging, Photo, Gifts, Apparel, Bags …).
 *
 * Outputs (all committed, reproducible):
 *   - src/data/helloprint-catalog.raw.json   → raw print_api/catalog shape
 *       (merged into catalog.json at build time; served alone in ?qa mode)
 *   - public/img/hp/prod/<slug>.svg          → generic product image per item
 *   - scripts/helloprint-import-payload.json  → ready-to-run CRM import payload
 *
 * Run:  node scripts/gen-helloprint-catalog.mjs
 */
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const TAG = 'helloprint';

/* ------------------------------------------------------------ helpers */

// Arabic-Indic digits so size/weight labels read natively in the RTL store.
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const toAr = (s) => String(s).replace(/[0-9]/g, (d) => AR_DIGITS[+d]);

/** option value */
const v = (label_ar, label_en, price_delta = 0, extra = {}) => ({
  label_ar,
  label_en,
  price_delta,
  ...extra,
});
/** option group */
const g = (name_ar, name_en, type, values) => ({ name_ar, name_en, type, values });

// A size value whose label carries the mm dimensions (→ proportional rect icon).
const size = (ar, en, w, h, delta = 0, extra = {}) =>
  v(`${ar} · ${toAr(w)}×${toAr(h)} مم`, `${en} · ${w}×${h} mm`, delta, extra);

// Quantity tier value (label is the count; the store shows a tier chip).
const qty = (n, delta = 0, extra = {}) =>
  v(`${toAr(n)} نسخة`, `${n} pcs`, delta, extra);

const qtyTier = (rows) => g('الكمية', 'Quantity', 'tier', rows);

/* Reusable option groups modelled on real HelloPrint configurators. */
const sidesStd = () =>
  g('الطباعة', 'Printed sides', 'select', [
    v('وجه واحد', 'Single-sided', 0, { icon: 'single', sublabel_ar: 'طباعة أمامية', sublabel_en: 'Front only' }),
    v('وجهين', 'Double-sided', 12, { icon: 'double', recommended: true, sublabel_ar: 'أمام وخلف', sublabel_en: 'Front & back' }),
  ]);

const cornersStd = () =>
  g('الزوايا', 'Corners', 'select', [
    v('زوايا قائمة', 'Square corners', 0, { icon: 'straight' }),
    v('زوايا دائرية', 'Rounded corners', 8, { icon: 'rounded', sublabel_ar: 'قص دائري', sublabel_en: 'Die-cut' }),
  ]);

const laminationStd = () =>
  g('التشطيب', 'Finishing', 'select', [
    v('بدون تشطيب', 'No finishing', 0, { icon: 'none' }),
    v('لامينيشن مط', 'Matte lamination', 18, { icon: 'matt', recommended: true, sublabel_ar: 'ملمس ناعم', sublabel_en: 'Soft touch' }),
    v('لامينيشن لامع', 'Gloss lamination', 18, { icon: 'gloss', sublabel_ar: 'لمعان عالٍ', sublabel_en: 'High shine' }),
    v('مخملي', 'Velvet / soft-touch', 32, { icon: 'matt', sublabel_ar: 'فاخر', sublabel_en: 'Premium' }),
  ]);

/* ------------------------------------------------------------ catalog spec */

// Each category: {slug, ar, en, color, glyph, blurbAr/En, products:[…]}
// Each product: {key, ar, en, dAr, dEn, price, art?, opts:[…]}
const CATS = [];
function cat(slug, ar, en, color, glyph, products) {
  CATS.push({ slug: `hp-${slug}`, ar, en, color, glyph, products });
}

/* 1 — Business cards */
cat('business-cards', 'بطاقات الأعمال', 'Business Cards', '#1F1FFE', 'card', [
  {
    key: 'classic-business-cards', ar: 'بطاقات عمل كلاسيكية', en: 'Classic Business Cards',
    dAr: 'بطاقات عمل بطباعة ألوان كاملة عالية الجودة لتبادل معلومات التواصل بأناقة.',
    dEn: 'High-quality full-colour business cards for making lasting connections.',
    price: 29,
    opts: [
      g('المقاس', 'Size', 'select', [
        size('قياسي', 'Standard', 85, 55, 0, { recommended: true }),
        size('عمودي', 'Portrait', 55, 85, 0),
        size('أمريكي', 'American', 90, 50, 4),
        size('مربع', 'Square', 55, 55, 6),
      ]),
      g('نوع الورق', 'Material', 'select', [
        v('٣٠٠ جرام أوفست', '300 gsm offset', 0, { icon: 'sheet', sublabel_ar: 'قابل للكتابة', sublabel_en: 'Writable' }),
        v('٣٥٠ جرام ساتان', '350 gsm silk', 8, { icon: 'sheet', recommended: true }),
        v('٤٠٠ جرام فاخر', '400 gsm deluxe', 18, { icon: 'sheet', sublabel_ar: 'سماكة عالية', sublabel_en: 'Extra thick' }),
      ]),
      laminationStd(), sidesStd(), cornersStd(),
      qtyTier([qty(100, 0, { recommended: true }), qty(250, 22), qty(500, 48), qty(1000, 85)]),
    ],
  },
  {
    key: 'eco-business-cards', ar: 'بطاقات عمل صديقة للبيئة', en: 'Eco Business Cards',
    dAr: 'بطاقات مطبوعة على ورق معاد تدويره ١٠٠٪ بألوان زاهية ومسؤولية بيئية.',
    dEn: 'Cards printed on 100% recycled stock — vivid colour, lighter footprint.',
    price: 34,
    opts: [
      g('المقاس', 'Size', 'select', [ size('قياسي', 'Standard', 85, 55, 0, { recommended: true }), size('مربع', 'Square', 55, 55, 6) ]),
      g('نوع الورق', 'Material', 'select', [
        v('٣٥٠ جرام معاد تدويره', '350 gsm recycled', 0, { icon: 'sheet', recommended: true }),
        v('٤٠٠ جرام كرافت طبيعي', '400 gsm natural kraft', 12, { icon: 'sheet', sublabel_ar: 'ملمس طبيعي', sublabel_en: 'Uncoated' }),
      ]),
      sidesStd(), cornersStd(),
      qtyTier([qty(100, 0, { recommended: true }), qty(250, 24), qty(500, 52), qty(1000, 92)]),
    ],
  },
  {
    key: 'deluxe-business-cards', ar: 'بطاقات عمل فاخرة', en: 'Deluxe Business Cards',
    dAr: 'بطاقات فاخرة مع تشطيبات مميزة تعكس هوية علامتك التجارية.',
    dEn: 'Premium cards with standout finishes that reflect your brand.',
    price: 59,
    opts: [
      g('المقاس', 'Size', 'select', [ size('قياسي', 'Standard', 85, 55, 0, { recommended: true }) ]),
      g('التشطيب المميز', 'Special finish', 'select', [
        v('ختم ذهبي', 'Gold foil', 45, { icon: 'foil', recommended: true, sublabel_ar: 'بريق معدني', sublabel_en: 'Metallic' }),
        v('ختم فضي', 'Silver foil', 45, { icon: 'foil' }),
        v('طباعة بارزة (سبوت UV)', 'Spot UV', 30, { icon: 'gloss' }),
      ]),
      laminationStd(), cornersStd(),
      qtyTier([qty(100, 0, { recommended: true }), qty(250, 40), qty(500, 78)]),
    ],
  },
  {
    key: 'appointment-cards', ar: 'بطاقات مواعيد', en: 'Appointment Cards',
    dAr: 'بطاقات مواعيد بحقول قابلة للكتابة، مثالية للعيادات والصالونات.',
    dEn: 'Writable appointment cards for clinics, salons and studios.',
    price: 27,
    opts: [
      g('المقاس', 'Size', 'select', [ size('قياسي', 'Standard', 85, 55, 0, { recommended: true }) ]),
      sidesStd(),
      qtyTier([qty(100, 0), qty(250, 20, { recommended: true }), qty(500, 44)]),
    ],
  },
  {
    key: 'folded-business-cards', ar: 'بطاقات عمل مطوية', en: 'Folded Business Cards',
    dAr: 'بطاقات مطوية توفّر مساحة مضاعفة لمعلوماتك.',
    dEn: 'Folded cards that double your usable print area.',
    price: 42,
    opts: [
      g('المقاس', 'Size', 'select', [ size('قياسي مطوي', 'Standard folded', 85, 110, 0, { recommended: true }) ]),
      laminationStd(), qtyTier([qty(100, 0), qty(250, 30, { recommended: true }), qty(500, 60)]),
    ],
  },
  {
    key: 'multilayer-business-cards', ar: 'بطاقات متعددة الطبقات', en: 'Multilayer Business Cards',
    dAr: 'بطاقات سميكة متعددة الطبقات مع حافة ملوّنة لإطلالة فاخرة.',
    dEn: 'Thick multilayer cards with a coloured edge for a luxe feel.',
    price: 79,
    opts: [
      g('لون الحافة', 'Edge colour', 'select', [
        v('حافة زرقاء', 'Blue edge', 0, { recommended: true }),
        v('حافة ذهبية', 'Gold edge', 10, { icon: 'foil' }),
        v('حافة سوداء', 'Black edge', 0),
      ]),
      cornersStd(), qtyTier([qty(100, 0, { recommended: true }), qty(250, 60)]),
    ],
  },
]);

/* 2 — Flyers & leaflets */
cat('flyers', 'فلايرات ومطبوعات', 'Flyers & Leaflets', '#0EA5A0', 'flyer', [
  {
    key: 'classic-flyers', ar: 'فلايرات كلاسيكية', en: 'Classic Flyers',
    dAr: 'الخيار الأوفر للحملات التسويقية بطباعة ألوان كاملة وتسليم سريع.',
    dEn: 'The most cost-effective option for campaigns — full colour, fast turnaround.',
    price: 39,
    opts: [
      g('المقاس', 'Size', 'select', [
        size('A6', 'A6', 105, 148, 0), size('A5', 'A5', 148, 210, 8, { recommended: true }),
        size('DL', 'DL', 99, 210, 8), size('A4', 'A4', 210, 297, 18),
      ]),
      g('نوع الورق', 'Paper', 'select', [
        v('١٣٥ جرام لامع', '135 gsm gloss', 0, { icon: 'sheet' }),
        v('١٧٠ جرام ساتان', '170 gsm silk', 10, { icon: 'sheet', recommended: true }),
        v('٣٠٠ جرام كرتوني', '300 gsm card', 22, { icon: 'sheet' }),
      ]),
      sidesStd(),
      qtyTier([qty(250, 0), qty(500, 18, { recommended: true }), qty(1000, 40), qty(2500, 85), qty(5000, 150)]),
    ],
  },
  {
    key: 'eco-flyers', ar: 'فلايرات صديقة للبيئة', en: 'Eco Flyers',
    dAr: 'فلايرات على ورق معاد تدويره خالٍ من الكلور، مستدامة وقابلة لإعادة التدوير.',
    dEn: 'Sustainable, recyclable flyers on chlorine-free recycled paper.',
    price: 44,
    opts: [
      g('المقاس', 'Size', 'select', [ size('A5', 'A5', 148, 210, 0, { recommended: true }), size('A4', 'A4', 210, 297, 12) ]),
      g('نوع الورق', 'Paper', 'select', [
        v('طبيعي معاد تدويره', 'Recycled natural', 0, { icon: 'sheet', recommended: true }),
        v('كرافت غير مطلي', 'Uncoated kraft', 8, { icon: 'sheet' }),
      ]),
      sidesStd(), qtyTier([qty(250, 0), qty(500, 20, { recommended: true }), qty(1000, 44), qty(2500, 95)]),
    ],
  },
  {
    key: 'premium-flyers', ar: 'فلايرات خامات مميزة', en: 'Special Material Flyers',
    dAr: 'اجذب الأنظار بخامات فاخرة: ذهبي، فضي، أو لؤلؤي.',
    dEn: 'Stand out with metallic gold, silver or pearl stocks.',
    price: 69,
    opts: [
      g('المقاس', 'Size', 'select', [ size('A5', 'A5', 148, 210, 0, { recommended: true }), size('A6', 'A6', 105, 148, 0) ]),
      g('الخامة', 'Material', 'select', [
        v('ذهبي معدني', 'Metallic gold', 0, { icon: 'foil', recommended: true }),
        v('فضي معدني', 'Metallic silver', 0, { icon: 'foil' }),
        v('لؤلؤي', 'Pearl marble', 6),
      ]),
      sidesStd(), qtyTier([qty(250, 0), qty(500, 40, { recommended: true }), qty(1000, 85)]),
    ],
  },
  {
    key: 'ncr-pads', ar: 'دفاتر كربونية NCR', en: 'NCR Carbonless Pads',
    dAr: 'دفاتر فواتير وإيصالات ذاتية النسخ من نسختين أو ثلاث.',
    dEn: 'Self-copying invoice / receipt pads in 2 or 3 parts.',
    price: 89, art: true,
    opts: [
      g('عدد النسخ', 'Parts', 'select', [
        v('نسختان', '2-part', 0, { icon: 'double', recommended: true }),
        v('ثلاث نسخ', '3-part', 25, { icon: 'double' }),
      ]),
      g('المقاس', 'Size', 'select', [ size('A5', 'A5', 148, 210, 0, { recommended: true }), size('A4', 'A4', 210, 297, 20) ]),
      qtyTier([qty(5, 0), qty(10, 60, { recommended: true }), qty(25, 140)]),
    ],
  },
]);

/* 3 — Folded leaflets */
cat('folded-leaflets', 'مطويات وبروشورات', 'Folded Leaflets', '#7C3AED', 'fold', [
  {
    key: 'tri-fold-leaflets', ar: 'مطوية ثلاثية', en: 'Tri-fold Leaflets',
    dAr: 'مطوية ثلاثية الطي، مثالية للعروض والقوائم والتعريف بالخدمات.',
    dEn: 'Classic tri-fold — perfect for menus, services and offers.',
    price: 55,
    opts: [
      g('المقاس', 'Size', 'select', [ size('A4 مطوي', 'A4 folded', 210, 297, 0, { recommended: true }), size('A5 مطوي', 'A5 folded', 148, 210, 0) ]),
      g('نوع الطي', 'Fold', 'select', [
        v('طي ثلاثي', 'Tri-fold', 0, { icon: 'fold', recommended: true }),
        v('طي نصفي', 'Half-fold', 0),
        v('طي Z', 'Z-fold', 4),
      ]),
      g('نوع الورق', 'Paper', 'select', [ v('١٧٠ جرام ساتان', '170 gsm silk', 0, { icon: 'sheet', recommended: true }), v('٢٥٠ جرام لامع', '250 gsm gloss', 14, { icon: 'sheet' }) ]),
      laminationStd(), qtyTier([qty(250, 0), qty(500, 30, { recommended: true }), qty(1000, 65), qty(2500, 140)]),
    ],
  },
  {
    key: 'roll-fold-leaflets', ar: 'مطوية لفّية', en: 'Roll-fold Leaflets',
    dAr: 'مطوية بأربع لوحات وطيّة لفّية لمحتوى أوسع.',
    dEn: 'Four-panel roll fold for richer content.',
    price: 62,
    opts: [
      g('المقاس', 'Size', 'select', [ size('A4 مطوي', 'A4 folded', 210, 297, 0, { recommended: true }) ]),
      laminationStd(), qtyTier([qty(250, 0), qty(500, 34, { recommended: true }), qty(1000, 72)]),
    ],
  },
  {
    key: 'menu-cards', ar: 'قوائم طعام', en: 'Menu Cards',
    dAr: 'قوائم طعام مقاومة للبقع بتشطيبات فاخرة للمطاعم والمقاهي.',
    dEn: 'Spill-resistant menu cards with premium finishes.',
    price: 48,
    opts: [
      g('المقاس', 'Size', 'select', [ size('A4', 'A4', 210, 297, 0, { recommended: true }), size('A5', 'A5', 148, 210, 0), size('DL', 'DL', 99, 210, 0) ]),
      laminationStd(), sidesStd(), qtyTier([qty(50, 0), qty(100, 25, { recommended: true }), qty(250, 55)]),
    ],
  },
]);

/* 4 — Posters */
cat('posters', 'بوسترات', 'Posters', '#DB2777', 'poster', [
  {
    key: 'standard-posters', ar: 'بوسترات قياسية', en: 'Standard Posters',
    dAr: 'بوسترات بألوان زاهية للفعاليات والعروض وتزيين الجدران.',
    dEn: 'Vivid posters for events, promotions and wall décor.',
    price: 18,
    opts: [
      g('المقاس', 'Size', 'select', [
        size('A3', 'A3', 297, 420, 0), size('A2', 'A2', 420, 594, 12, { recommended: true }),
        size('A1', 'A1', 594, 841, 28), size('A0', 'A0', 841, 1189, 55), size('B1', 'B1', 700, 1000, 40),
      ]),
      g('نوع الورق', 'Paper', 'select', [
        v('١٣٥ جرام لامع', '135 gsm gloss', 0, { icon: 'sheet' }),
        v('٢٥٠ جرام لامع', '250 gsm gloss', 10, { icon: 'sheet', recommended: true }),
        v('١٩٠ جرام ورق صور', '190 gsm photo', 22, { icon: 'sheet' }),
      ]),
      laminationStd(),
      qtyTier([qty(1, 0), qty(5, 30), qty(10, 55, { recommended: true }), qty(25, 120)]),
    ],
  },
  {
    key: 'waterproof-posters', ar: 'بوسترات مقاومة للماء', en: 'Waterproof Posters',
    dAr: 'بوسترات على خامة PVC مقاومة للماء للاستخدام الخارجي.',
    dEn: 'Water-resistant PVC posters for outdoor use.',
    price: 34,
    opts: [
      g('المقاس', 'Size', 'select', [ size('A2', 'A2', 420, 594, 0, { recommended: true }), size('A1', 'A1', 594, 841, 24), size('A0', 'A0', 841, 1189, 50) ]),
      qtyTier([qty(1, 0), qty(5, 40, { recommended: true }), qty(10, 75)]),
    ],
  },
  {
    key: 'blueback-posters', ar: 'بوسترات بلوباك', en: 'Blueback Posters',
    dAr: 'بوسترات بلوباك للحملات الجدارية الخارجية واللوحات الكبيرة.',
    dEn: 'Blueback billboard posters for outdoor wall campaigns.',
    price: 28,
    opts: [
      g('المقاس', 'Size', 'select', [ size('A1', 'A1', 594, 841, 0, { recommended: true }), size('A0', 'A0', 841, 1189, 26) ]),
      qtyTier([qty(10, 0), qty(25, 90, { recommended: true }), qty(50, 170)]),
    ],
  },
]);

/* 5 — Booklets */
cat('booklets', 'كتيبات', 'Booklets', '#2563EB', 'book', [
  {
    key: 'stapled-booklets', ar: 'كتيبات بدبوس', en: 'Stapled Booklets',
    dAr: 'كتيبات مدبّسة (سرج) للكتالوجات والبرامج والتقارير.',
    dEn: 'Saddle-stitched booklets for catalogues, programmes and reports.',
    price: 95,
    opts: [
      g('المقاس', 'Size', 'select', [ size('A5', 'A5', 148, 210, 0, { recommended: true }), size('A4', 'A4', 210, 297, 30) ]),
      g('عدد الصفحات', 'Pages', 'tier', [
        v('٨ صفحات', '8 pages', 0, { recommended: true }), v('١٦ صفحة', '16 pages', 40),
        v('٢٤ صفحة', '24 pages', 80), v('٣٢ صفحة', '32 pages', 120),
      ]),
      g('الغلاف', 'Cover', 'select', [ v('نفس ورق الداخل', 'Self cover', 0, { icon: 'sheet', recommended: true }), v('غلاف ٣٠٠ جرام', '300 gsm cover', 25, { icon: 'sheet' }) ]),
      qtyTier([qty(25, 0), qty(50, 120, { recommended: true }), qty(100, 220)]),
    ],
  },
  {
    key: 'perfect-bound-booklets', ar: 'كتيبات بغلاف لاصق', en: 'Perfect Bound Booklets',
    dAr: 'كتيبات بتجليد لاصق وكعب مسطّح لمظهر احترافي.',
    dEn: 'Perfect-bound booklets with a flat printable spine.',
    price: 165,
    opts: [
      g('المقاس', 'Size', 'select', [ size('A5', 'A5', 148, 210, 0, { recommended: true }), size('A4', 'A4', 210, 297, 40) ]),
      g('عدد الصفحات', 'Pages', 'tier', [ v('٤٨ صفحة', '48 pages', 0, { recommended: true }), v('٦٤ صفحة', '64 pages', 40), v('٩٦ صفحة', '96 pages', 90) ]),
      qtyTier([qty(25, 0), qty(50, 180, { recommended: true }), qty(100, 340)]),
    ],
  },
]);

/* 6 — Stationery & office */
cat('stationery', 'قرطاسية ومكتب', 'Stationery & Office', '#0891B2', 'doc', [
  {
    key: 'letterheads', ar: 'أوراق رسمية', en: 'Letterheads',
    dAr: 'أوراق رسمية بهوية علامتك التجارية للمراسلات والفواتير.',
    dEn: 'Branded letterheads for correspondence and invoices.',
    price: 45,
    opts: [
      g('المقاس', 'Size', 'select', [ size('A4', 'A4', 210, 297, 0, { recommended: true }) ]),
      g('نوع الورق', 'Paper', 'select', [ v('٩٠ جرام أوفست', '90 gsm offset', 0, { icon: 'sheet', recommended: true }), v('١٢٠ جرام فاخر', '120 gsm premium', 14, { icon: 'sheet' }) ]),
      sidesStd(), qtyTier([qty(250, 0), qty(500, 26, { recommended: true }), qty(1000, 55)]),
    ],
  },
  {
    key: 'notepads', ar: 'دفاتر ملاحظات', en: 'Notepads',
    dAr: 'دفاتر ملاحظات مغرّاة من الأعلى بعدد أوراق مخصص.',
    dEn: 'Glued-top notepads with a custom sheet count.',
    price: 38,
    opts: [
      g('المقاس', 'Size', 'select', [ size('A5', 'A5', 148, 210, 0, { recommended: true }), size('A4', 'A4', 210, 297, 14), size('A6', 'A6', 105, 148, 0) ]),
      g('عدد الأوراق', 'Sheets', 'tier', [ v('٢٥ ورقة', '25 sheets', 0, { recommended: true }), v('٥٠ ورقة', '50 sheets', 12), v('١٠٠ ورقة', '100 sheets', 26) ]),
      qtyTier([qty(25, 0), qty(50, 40, { recommended: true }), qty(100, 85)]),
    ],
  },
  {
    key: 'presentation-folders', ar: 'ملفات تعريفية', en: 'Presentation Folders',
    dAr: 'ملفات تعريفية بجيب داخلي لحفظ المستندات وعروض الشركة.',
    dEn: 'Presentation folders with an inner pocket for documents.',
    price: 120, art: true,
    opts: [
      g('المقاس', 'Size', 'select', [ size('A4', 'A4', 220, 310, 0, { recommended: true }) ]),
      laminationStd(), qtyTier([qty(50, 0), qty(100, 130, { recommended: true }), qty(250, 300)]),
    ],
  },
  {
    key: 'compliment-slips', ar: 'بطاقات مجاملة', en: 'Compliment Slips',
    dAr: 'بطاقات مجاملة أنيقة ترافق طلباتك ومراسلاتك.',
    dEn: 'Elegant compliment slips to accompany orders and mail.',
    price: 32,
    opts: [
      g('المقاس', 'Size', 'select', [ size('DL', 'DL', 99, 210, 0, { recommended: true }) ]),
      qtyTier([qty(250, 0), qty(500, 22, { recommended: true }), qty(1000, 48)]),
    ],
  },
  {
    key: 'certificates', ar: 'شهادات', en: 'Certificates',
    dAr: 'شهادات تقدير وحضور على ورق فاخر مع خيار الختم الذهبي.',
    dEn: 'Award & attendance certificates on premium stock, optional gold foil.',
    price: 40,
    opts: [
      g('المقاس', 'Size', 'select', [ size('A4', 'A4', 210, 297, 0, { recommended: true }) ]),
      g('اللمسة', 'Accent', 'select', [ v('بدون', 'None', 0, { icon: 'none', recommended: true }), v('إطار ذهبي', 'Gold foil border', 22, { icon: 'foil' }) ]),
      qtyTier([qty(25, 0), qty(50, 28, { recommended: true }), qty(100, 60)]),
    ],
  },
]);

/* 7 — Envelopes */
cat('envelopes', 'أظرف', 'Envelopes', '#CA8A04', 'env', [
  {
    key: 'standard-envelopes', ar: 'أظرف قياسية', en: 'Standard Envelopes',
    dAr: 'أظرف مطبوعة بهوية علامتك التجارية بمقاسات شائعة.',
    dEn: 'Branded envelopes in common business sizes.',
    price: 52,
    opts: [
      g('المقاس', 'Size', 'select', [ size('DL', 'DL', 110, 220, 0, { recommended: true }), size('C5', 'C5', 162, 229, 8), size('C4', 'C4', 229, 324, 20) ]),
      g('الطباعة', 'Print', 'select', [ v('لون واحد', '1 colour', 0, { recommended: true }), v('ألوان كاملة', 'Full colour', 18, { icon: 'gloss' }) ]),
      qtyTier([qty(250, 0), qty(500, 30, { recommended: true }), qty(1000, 62)]),
    ],
  },
  {
    key: 'window-envelopes', ar: 'أظرف بنافذة', en: 'Window Envelopes',
    dAr: 'أظرف بنافذة شفافة لإظهار العنوان تلقائياً.',
    dEn: 'Window envelopes that show the address automatically.',
    price: 58,
    opts: [
      g('المقاس', 'Size', 'select', [ size('DL', 'DL', 110, 220, 0, { recommended: true }) ]),
      qtyTier([qty(250, 0), qty(500, 34, { recommended: true }), qty(1000, 70)]),
    ],
  },
  {
    key: 'padded-envelopes', ar: 'أظرف مبطّنة', en: 'Padded Envelopes',
    dAr: 'أظرف مبطّنة تحمي المحتوى أثناء الشحن مع طباعة شعارك.',
    dEn: 'Padded mailers that protect contents, printed with your logo.',
    price: 78, art: true,
    opts: [
      g('المقاس', 'Size', 'select', [ size('صغير', 'Small', 180, 260, 0, { recommended: true }), size('كبير', 'Large', 260, 350, 14) ]),
      qtyTier([qty(100, 0), qty(250, 90, { recommended: true }), qty(500, 170)]),
    ],
  },
]);

/* 8 — Stickers & labels */
cat('stickers-labels', 'ملصقات وليبل', 'Stickers & Labels', '#EA580C', 'sticker', [
  {
    key: 'individual-stickers', ar: 'ملصقات مفردة', en: 'Individual Stickers',
    dAr: 'ملصقات مقصوصة بدقة الليزر بأشكال دائرية ومربعة ومستطيلة.',
    dEn: 'Laser-cut individual stickers in round, square and rectangle shapes.',
    price: 25,
    opts: [
      g('الشكل', 'Shape', 'select', [
        v('دائري', 'Round', 0, { icon: 'rounded', recommended: true }),
        v('مربع', 'Square', 0, { icon: 'straight' }),
        v('مستطيل', 'Rectangle', 0, { icon: 'straight' }),
      ]),
      g('المقاس', 'Size', 'select', [
        size('صغير', 'Small', 40, 40, 0), size('متوسط', 'Medium', 60, 60, 6, { recommended: true }), size('كبير', 'Large', 95, 95, 14),
      ]),
      g('الخامة', 'Material', 'select', [
        v('ورق لاصق', 'Self-adhesive paper', 0, { icon: 'sheet', recommended: true }),
        v('PVC مقاوم للماء', 'Waterproof PVC', 12, { icon: 'sheet' }),
        v('شفاف', 'Transparent', 14, { icon: 'gloss' }),
      ]),
      g('التشطيب', 'Finish', 'select', [ v('لامع', 'Glossy', 0, { icon: 'gloss', recommended: true }), v('مط', 'Matte', 0, { icon: 'matt' }) ]),
      qtyTier([qty(50, 0), qty(100, 18, { recommended: true }), qty(250, 40), qty(500, 75), qty(1000, 130)]),
    ],
  },
  {
    key: 'sticker-sheets', ar: 'أوراق ملصقات', en: 'Sticker Sheets',
    dAr: 'عدة ملصقات على ورقة واحدة سهلة النزع.',
    dEn: 'Multiple kiss-cut stickers on one easy-peel sheet.',
    price: 30,
    opts: [
      g('المقاس', 'Size', 'select', [ size('A6', 'A6', 105, 148, 0, { recommended: true }), size('A5', 'A5', 148, 210, 8), size('A4', 'A4', 210, 297, 18) ]),
      qtyTier([qty(25, 0), qty(50, 22, { recommended: true }), qty(100, 45), qty(250, 100)]),
    ],
  },
  {
    key: 'roll-labels', ar: 'ليبل على رول', en: 'Labels on a Roll',
    dAr: 'ليبل منتجات على رول لخطوط التعبئة والتغليف.',
    dEn: 'Product labels on a roll for packaging lines.',
    price: 65,
    opts: [
      g('الشكل', 'Shape', 'select', [ v('دائري', 'Round', 0, { icon: 'rounded', recommended: true }), v('مستطيل', 'Rectangle', 0, { icon: 'straight' }) ]),
      g('الخامة', 'Material', 'select', [ v('ورق أبيض', 'White paper', 0, { icon: 'sheet', recommended: true }), v('فيلم شفاف', 'Clear film', 18, { icon: 'gloss' }) ]),
      qtyTier([qty(250, 0), qty(500, 40, { recommended: true }), qty(1000, 80), qty(2500, 170)]),
    ],
  },
  {
    key: 'floor-stickers', ar: 'ملصقات أرضية', en: 'Floor Stickers',
    dAr: 'ملصقات أرضية مضادة للانزلاق للإرشاد والحملات داخل المتاجر.',
    dEn: 'Anti-slip floor stickers for wayfinding and in-store campaigns.',
    price: 55, art: true,
    opts: [
      g('المقاس', 'Size', 'select', [ size('٣٠سم دائري', '30cm round', 300, 300, 0, { recommended: true }), size('٥٠سم دائري', '50cm round', 500, 500, 20) ]),
      qtyTier([qty(5, 0), qty(10, 45, { recommended: true }), qty(25, 100)]),
    ],
  },
]);

/* 9 — Banners */
cat('banners', 'بنرات', 'Banners', '#16A34A', 'banner', [
  {
    key: 'pvc-banners', ar: 'بنر فليكس PVC', en: 'PVC Banners',
    dAr: 'بنرات فليكس متينة للاستخدام الداخلي والخارجي مع حلقات معدنية.',
    dEn: 'Durable PVC banners for indoor/outdoor use with eyelets.',
    price: 35, art: true,
    opts: [
      g('المقاس', 'Size', 'select', [
        size('١×١ م', '1×1 m', 1000, 1000, 0), size('٢×١ م', '2×1 m', 2000, 1000, 30, { recommended: true }),
        size('٣×١ م', '3×1 m', 3000, 1000, 60), size('٤×١ م', '4×1 m', 4000, 1000, 90),
      ]),
      g('الخامة', 'Material', 'select', [ v('فليكس ٣١٠ جرام', 'Flex 310 gsm', 0, { icon: 'sheet', recommended: true }), v('فليكس ٤٤٠ جرام', 'Flex 440 gsm', 20, { icon: 'sheet' }) ]),
      g('التشطيب', 'Finishing', 'select', [ v('حلقات معدنية', 'Metal eyelets', 0, { recommended: true }), v('جيوب للأنبوب', 'Pole pockets', 12 ) ]),
      qtyTier([qty(1, 0), qty(3, 60, { recommended: true }), qty(5, 100)]),
    ],
  },
  {
    key: 'mesh-banners', ar: 'بنر شبكي', en: 'Mesh Banners',
    dAr: 'بنرات شبكية تسمح بمرور الهواء، مثالية للأسوار والمواجهات.',
    dEn: 'Air-permeable mesh banners for fences and building facades.',
    price: 42, art: true,
    opts: [
      g('المقاس', 'Size', 'select', [ size('٢×١ م', '2×1 m', 2000, 1000, 0, { recommended: true }), size('٣×٢ م', '3×2 m', 3000, 2000, 60) ]),
      qtyTier([qty(1, 0), qty(3, 70, { recommended: true })]),
    ],
  },
  {
    key: 'fabric-banners', ar: 'بنر قماشي', en: 'Fabric Banners',
    dAr: 'بنرات قماشية بألوان دقيقة ولمعان منخفض للمعارض.',
    dEn: 'Low-glare fabric banners with crisp colour for exhibitions.',
    price: 68, art: true,
    opts: [
      g('المقاس', 'Size', 'select', [ size('٢×١ م', '2×1 m', 2000, 1000, 0, { recommended: true }), size('٣×١ م', '3×1 m', 3000, 1000, 40) ]),
      qtyTier([qty(1, 0), qty(3, 90, { recommended: true })]),
    ],
  },
]);

/* 10 — Roller banners */
cat('roller-banners', 'رول أب', 'Roller Banners', '#4F46E5', 'roller', [
  {
    key: 'standard-roller-banners', ar: 'رول أب قياسي', en: 'Standard Roller Banners',
    dAr: 'رول أب مع حقيبة حمل مجانية — الخيار الأوفر للفعاليات والعروض.',
    dEn: 'Roller banner with free carry bag — the economical event choice.',
    price: 185, art: true,
    opts: [
      g('المقاس', 'Size', 'select', [
        size('صغير', 'Small', 850, 2000, 0), size('متوسط', 'Medium', 1000, 2000, 25, { recommended: true }),
        size('كبير', 'Large', 1200, 2000, 55), size('XL', 'XL', 2000, 2000, 140),
      ]),
      g('القاعدة', 'Base', 'select', [
        v('قاعدة اقتصادية فضية', 'Silver budget base', 0, { recommended: true }),
        v('قاعدة سوداء', 'Black budget base', 0),
        v('قاعدة كرتون صديقة للبيئة', 'Eco cardboard base', 10, { sublabel_ar: 'قابلة للتدوير', sublabel_en: 'Recyclable' }),
        v('قاعدة بريميوم', 'Premium base', 45, { sublabel_ar: 'أثقل وأثبت', sublabel_en: 'Heavier & stable' }),
      ]),
      qtyTier([qty(1, 0), qty(2, 150, { recommended: true }), qty(5, 340)]),
    ],
  },
  {
    key: 'premium-roller-banners', ar: 'رول أب ديلوكس', en: 'Deluxe Roller Banners',
    dAr: 'رول أب بقاعدة ديلوكس وخامة فاخرة للعرض المتكرر.',
    dEn: 'Deluxe-base roller banner in premium fabric for repeated use.',
    price: 265, art: true,
    opts: [
      g('المقاس', 'Size', 'select', [ size('متوسط', 'Medium', 1000, 2000, 0, { recommended: true }), size('كبير', 'Large', 1200, 2000, 40) ]),
      qtyTier([qty(1, 0), qty(2, 220, { recommended: true })]),
    ],
  },
  {
    key: 'x-frame-banners', ar: 'حامل X', en: 'X-Frame Banners',
    dAr: 'بنر بحامل X خفيف وسهل التركيب.',
    dEn: 'Lightweight X-frame banner, quick to assemble.',
    price: 145, art: true,
    opts: [
      g('المقاس', 'Size', 'select', [ size('٦٠×١٦٠ سم', '60×160 cm', 600, 1600, 0, { recommended: true }), size('٨٠×١٨٠ سم', '80×180 cm', 800, 1800, 30) ]),
      qtyTier([qty(1, 0), qty(2, 120, { recommended: true })]),
    ],
  },
]);

/* 11 — Signs & panels */
cat('signs-panels', 'لوحات ولافتات', 'Signs & Panels', '#0D9488', 'sign', [
  {
    key: 'foamex-signs', ar: 'لوحات فوم PVC', en: 'Foamex Signs',
    dAr: 'لوحات فوم PVC خفيفة وصلبة للافتات الداخلية والخارجية.',
    dEn: 'Lightweight rigid Foamex PVC signs for indoor & outdoor.',
    price: 55, art: true,
    opts: [
      g('السماكة', 'Thickness', 'select', [ v('٣ مم', '3 mm', 0, { icon: 'sheet', recommended: true }), v('٥ مم', '5 mm', 15, { icon: 'sheet' }), v('١٠ مم', '10 mm', 35, { icon: 'sheet' }) ]),
      g('المقاس', 'Size', 'select', [ size('A2', 'A2', 420, 594, 0, { recommended: true }), size('A1', 'A1', 594, 841, 25), size('A0', 'A0', 841, 1189, 55) ]),
      qtyTier([qty(1, 0), qty(3, 90, { recommended: true }), qty(5, 150)]),
    ],
  },
  {
    key: 'aluminium-signs', ar: 'لوحات ألمنيوم', en: 'Aluminium Signs',
    dAr: 'لوحات ألمنيوم (ديبوند) متينة ومقاومة للطقس للاستخدام الخارجي طويل الأمد.',
    dEn: 'Durable weatherproof aluminium (Dibond) signs for long-term outdoor use.',
    price: 95, art: true,
    opts: [
      g('المقاس', 'Size', 'select', [ size('A2', 'A2', 420, 594, 0, { recommended: true }), size('A1', 'A1', 594, 841, 40), size('A0', 'A0', 841, 1189, 90) ]),
      qtyTier([qty(1, 0), qty(3, 150, { recommended: true })]),
    ],
  },
  {
    key: 'pavement-signs', ar: 'لوحات أرصفة', en: 'Pavement Signs',
    dAr: 'لوحات A أرضية قابلة للتبديل لجذب المارة أمام المحل.',
    dEn: 'Swing A-board pavement signs with changeable graphics.',
    price: 240, art: true,
    opts: [
      g('النوع', 'Type', 'select', [ v('لوحة A كلاسيكية', 'Classic A-board', 0, { recommended: true }), v('قاعدة مياه', 'Water-base', 35, { sublabel_ar: 'ثبات في الرياح', sublabel_en: 'Wind-stable' }) ]),
      qtyTier([qty(1, 0), qty(2, 200, { recommended: true })]),
    ],
  },
]);

/* 12 — Flags */
cat('flags', 'أعلام', 'Flags', '#DC2626', 'flag', [
  {
    key: 'feather-flags', ar: 'أعلام ريشة', en: 'Feather Flags',
    dAr: 'أعلام ريشة عالية لجذب الأنظار في الفعاليات والمعارض الخارجية.',
    dEn: 'Tall feather flags that grab attention at outdoor events.',
    price: 210, art: true,
    opts: [
      g('المقاس', 'Size', 'select', [ v('صغير ٢٫٥م', 'Small 2.5 m', 0), v('متوسط ٣٫٥م', 'Medium 3.5 m', 40, { recommended: true }), v('كبير ٤٫٥م', 'Large 4.5 m', 90) ]),
      g('القاعدة', 'Base', 'select', [ v('قاعدة صليبية', 'Cross base', 0, { recommended: true }), v('قاعدة مياه', 'Water base', 30 ), v('وتد أرضي', 'Ground spike', 0) ]),
      g('الطباعة', 'Printed sides', 'select', [ v('وجه واحد', 'Single-sided', 0, { icon: 'single', recommended: true }), v('وجهين', 'Double-sided', 55, { icon: 'double' }) ]),
      qtyTier([qty(1, 0), qty(2, 170, { recommended: true })]),
    ],
  },
  {
    key: 'teardrop-flags', ar: 'أعلام دمعة', en: 'Teardrop Flags',
    dAr: 'أعلام على شكل دمعة ثابتة في الرياح ومثالية للمواقع الخارجية.',
    dEn: 'Wind-stable teardrop flags, ideal for exposed locations.',
    price: 205, art: true,
    opts: [
      g('المقاس', 'Size', 'select', [ v('متوسط ٣م', 'Medium 3 m', 0, { recommended: true }), v('كبير ٤م', 'Large 4 m', 60) ]),
      qtyTier([qty(1, 0), qty(2, 165, { recommended: true })]),
    ],
  },
  {
    key: 'bunting-flags', ar: 'أعلام بنتينج', en: 'Bunting',
    dAr: 'سلاسل أعلام مثلثة للزينة والافتتاحات والمناسبات.',
    dEn: 'Triangular bunting strings for décor, openings and events.',
    price: 60, art: true,
    opts: [
      g('الطول', 'Length', 'select', [ v('٥ أمتار', '5 m', 0, { recommended: true }), v('١٠ أمتار', '10 m', 45) ]),
      qtyTier([qty(1, 0), qty(5, 220, { recommended: true })]),
    ],
  },
]);

/* 13 — Packaging & boxes */
cat('packaging', 'تغليف وعلب', 'Packaging & Boxes', '#B45309', 'box', [
  {
    key: 'product-boxes', ar: 'علب منتجات', en: 'Product Boxes',
    dAr: 'علب مقوّاة مطبوعة بالكامل لتغليف منتجاتك بهوية مميزة.',
    dEn: 'Full-colour rigid product boxes that brand your packaging.',
    price: 140, art: true,
    opts: [
      g('المقاس', 'Size', 'select', [ size('صغير', 'Small', 100, 100, 0, { recommended: true }), size('متوسط', 'Medium', 150, 150, 30), size('كبير', 'Large', 220, 220, 70) ]),
      laminationStd(), qtyTier([qty(50, 0), qty(100, 130, { recommended: true }), qty(250, 300)]),
    ],
  },
  {
    key: 'pillow-boxes', ar: 'علب وسادة', en: 'Pillow Boxes',
    dAr: 'علب وسادة أنيقة للهدايا والإكسسوارات الصغيرة.',
    dEn: 'Elegant pillow boxes for gifts and small accessories.',
    price: 85, art: true,
    opts: [
      g('المقاس', 'Size', 'select', [ size('صغير', 'Small', 90, 60, 0, { recommended: true }), size('متوسط', 'Medium', 140, 90, 20) ]),
      qtyTier([qty(50, 0), qty(100, 70, { recommended: true }), qty(250, 160)]),
    ],
  },
  {
    key: 'paper-bags', ar: 'أكياس ورقية', en: 'Paper Bags',
    dAr: 'أكياس ورقية بمقابض مطبوعة بشعارك، مثالية للمتاجر.',
    dEn: 'Branded paper carrier bags with handles for retail.',
    price: 95, art: true,
    opts: [
      g('المقاس', 'Size', 'select', [ size('صغير', 'Small', 180, 220, 0, { recommended: true }), size('متوسط', 'Medium', 260, 320, 25), size('كبير', 'Large', 320, 400, 55) ]),
      laminationStd(), qtyTier([qty(100, 0), qty(250, 120, { recommended: true }), qty(500, 220)]),
    ],
  },
  {
    key: 'swing-tags', ar: 'بطاقات تعليق', en: 'Swing Tags',
    dAr: 'بطاقات تعليق للمنتجات والملابس مع ثقب وخيط.',
    dEn: 'Product & garment swing tags with hole and string.',
    price: 34,
    opts: [
      g('الشكل', 'Shape', 'select', [ v('مستطيل', 'Rectangle', 0, { icon: 'straight', recommended: true }), v('دائري', 'Round', 4, { icon: 'rounded' }) ]),
      cornersStd(), qtyTier([qty(100, 0), qty(250, 26, { recommended: true }), qty(500, 55)]),
    ],
  },
]);

/* 14 — Photo gifts */
cat('photo-gifts', 'هدايا وصور', 'Photo Gifts', '#9333EA', 'photo', [
  {
    key: 'canvas-prints', ar: 'لوحات كانفس', en: 'Canvas Prints',
    dAr: 'اطبع صورك على كانفس ممدود على إطار خشبي جاهز للتعليق.',
    dEn: 'Your photos on gallery-wrapped canvas, ready to hang.',
    price: 89,
    opts: [
      g('المقاس', 'Size', 'select', [ size('٣٠×٣٠', '30×30', 300, 300, 0, { recommended: true }), size('٤٠×٦٠', '40×60', 400, 600, 30), size('٦٠×٩٠', '60×90', 600, 900, 80) ]),
      qtyTier([qty(1, 0), qty(2, 70, { recommended: true }), qty(3, 130)]),
    ],
  },
  {
    key: 'photo-mugs', ar: 'أكواب بالصور', en: 'Photo Mugs',
    dAr: 'أكواب سيراميك مطبوعة بصورك أو شعارك، هدية دائمة.',
    dEn: 'Ceramic mugs printed with your photo or logo.',
    price: 29,
    opts: [
      g('اللون', 'Colour', 'select', [ v('أبيض', 'White', 0, { recommended: true }), v('داخل ملوّن', 'Coloured inside', 6), v('سحري متغير', 'Magic colour-change', 14) ]),
      qtyTier([qty(1, 0), qty(6, 60, { recommended: true }), qty(12, 110), qty(36, 300)]),
    ],
  },
  {
    key: 'acrylic-prints', ar: 'لوحات أكريليك', en: 'Acrylic Prints',
    dAr: 'طباعة صور خلف أكريليك لامع بعمق لوني مميز.',
    dEn: 'Photos behind glossy acrylic for striking depth.',
    price: 130,
    opts: [
      g('المقاس', 'Size', 'select', [ size('٣٠×٤٠', '30×40', 300, 400, 0, { recommended: true }), size('٥٠×٧٠', '50×70', 500, 700, 60) ]),
      qtyTier([qty(1, 0), qty(2, 110, { recommended: true })]),
    ],
  },
  {
    key: 'photo-puzzles', ar: 'أحجية بالصور', en: 'Photo Puzzles',
    dAr: 'أحجية (بازل) مطبوعة بصورتك المفضلة في علبة هدية.',
    dEn: 'Jigsaw puzzle printed with your favourite photo, in a gift box.',
    price: 45,
    opts: [
      g('عدد القطع', 'Pieces', 'select', [ v('٢٠٠ قطعة', '200 pieces', 0, { recommended: true }), v('٥٠٠ قطعة', '500 pieces', 15), v('١٠٠٠ قطعة', '1000 pieces', 30) ]),
      qtyTier([qty(1, 0), qty(3, 90, { recommended: true })]),
    ],
  },
]);

/* 15 — Drinkware */
cat('drinkware', 'أكواب وقوارير', 'Drinkware', '#0369A1', 'cup', [
  {
    key: 'travel-mugs', ar: 'أكواب حرارية', en: 'Travel Mugs',
    dAr: 'أكواب حرارية معدنية مطبوعة بشعارك تحافظ على الحرارة.',
    dEn: 'Insulated stainless travel mugs branded with your logo.',
    price: 39, art: true,
    opts: [
      g('اللون', 'Colour', 'select', [ v('فضي', 'Silver', 0, { recommended: true }), v('أسود', 'Black', 0), v('أبيض', 'White', 0), v('أزرق', 'Blue', 0) ]),
      g('طريقة الطباعة', 'Print method', 'select', [ v('حفر ليزر', 'Laser engrave', 0, { recommended: true }), v('طباعة UV ملوّنة', 'Full-colour UV', 8, { icon: 'gloss' }) ]),
      qtyTier([qty(25, 0), qty(50, 120, { recommended: true }), qty(100, 220), qty(250, 500)]),
    ],
  },
  {
    key: 'water-bottles', ar: 'قوارير مياه', en: 'Water Bottles',
    dAr: 'قوارير مياه رياضية قابلة لإعادة الاستخدام بطباعة شعارك.',
    dEn: 'Reusable sports water bottles printed with your logo.',
    price: 32, art: true,
    opts: [
      g('السعة', 'Capacity', 'select', [ v('٥٠٠ مل', '500 ml', 0, { recommended: true }), v('٧٥٠ مل', '750 ml', 6), v('١ لتر', '1 L', 10) ]),
      g('اللون', 'Colour', 'select', [ v('شفاف', 'Clear', 0, { recommended: true }), v('أسود', 'Black', 0), v('أخضر', 'Green', 0) ]),
      qtyTier([qty(25, 0), qty(50, 90, { recommended: true }), qty(100, 170)]),
    ],
  },
  {
    key: 'ceramic-mugs', ar: 'أكواب سيراميك', en: 'Ceramic Mugs',
    dAr: 'أكواب سيراميك كلاسيكية مطبوعة بألوان كاملة.',
    dEn: 'Classic full-colour ceramic mugs.',
    price: 24, art: true,
    opts: [
      g('اللون', 'Colour', 'select', [ v('أبيض', 'White', 0, { recommended: true }), v('مقبض ملوّن', 'Coloured handle', 5) ]),
      qtyTier([qty(36, 0), qty(72, 130, { recommended: true }), qty(144, 240)]),
    ],
  },
]);

/* 16 — Apparel */
cat('apparel', 'ملابس مطبوعة', 'Apparel & Textiles', '#374151', 'shirt', [
  {
    key: 'promo-tshirts', ar: 'تيشيرتات دعائية', en: 'Promotional T-Shirts',
    dAr: 'تيشيرتات قطنية مطبوعة بشعارك للفعاليات وفرق العمل.',
    dEn: 'Cotton tees printed with your logo for events and teams.',
    price: 35, art: true,
    opts: [
      g('اللون', 'Colour', 'select', [ v('أبيض', 'White', 0, { recommended: true }), v('أسود', 'Black', 0), v('كحلي', 'Navy', 0), v('رمادي', 'Grey', 0) ]),
      g('المقاس', 'Size', 'select', [ v('S', 'S', 0), v('M', 'M', 0, { recommended: true }), v('L', 'L', 0), v('XL', 'XL', 0), v('XXL', 'XXL', 3) ]),
      g('طريقة الطباعة', 'Print method', 'select', [ v('طباعة حرارية', 'Heat transfer', 0, { recommended: true }), v('طباعة شاشة', 'Screen print', 6), v('تطريز', 'Embroidery', 12) ]),
      qtyTier([qty(10, 0), qty(25, 80, { recommended: true }), qty(50, 150), qty(100, 280)]),
    ],
  },
  {
    key: 'hoodies', ar: 'هوديات', en: 'Hoodies',
    dAr: 'هوديات دافئة مطبوعة أو مطرّزة بهوية فريقك.',
    dEn: 'Warm hoodies printed or embroidered with your brand.',
    price: 79, art: true,
    opts: [
      g('اللون', 'Colour', 'select', [ v('أسود', 'Black', 0, { recommended: true }), v('رمادي', 'Grey', 0), v('كحلي', 'Navy', 0) ]),
      g('المقاس', 'Size', 'select', [ v('S', 'S', 0), v('M', 'M', 0, { recommended: true }), v('L', 'L', 0), v('XL', 'XL', 0), v('XXL', 'XXL', 5) ]),
      qtyTier([qty(10, 0), qty(25, 180, { recommended: true }), qty(50, 340)]),
    ],
  },
  {
    key: 'polo-shirts', ar: 'قمصان بولو', en: 'Polo Shirts',
    dAr: 'قمصان بولو أنيقة لزي العمل مع تطريز الشعار.',
    dEn: 'Smart polo shirts for workwear with logo embroidery.',
    price: 55, art: true,
    opts: [
      g('اللون', 'Colour', 'select', [ v('أبيض', 'White', 0, { recommended: true }), v('كحلي', 'Navy', 0), v('أسود', 'Black', 0) ]),
      g('المقاس', 'Size', 'select', [ v('M', 'M', 0, { recommended: true }), v('L', 'L', 0), v('XL', 'XL', 0) ]),
      qtyTier([qty(10, 0), qty(25, 120, { recommended: true }), qty(50, 230)]),
    ],
  },
  {
    key: 'caps', ar: 'قبعات', en: 'Caps',
    dAr: 'قبعات كاجوال مطرّزة بشعارك، هدية عملية.',
    dEn: 'Casual caps embroidered with your logo.',
    price: 28, art: true,
    opts: [
      g('اللون', 'Colour', 'select', [ v('أسود', 'Black', 0, { recommended: true }), v('كحلي', 'Navy', 0), v('أبيض', 'White', 0) ]),
      qtyTier([qty(25, 0), qty(50, 90, { recommended: true }), qty(100, 160)]),
    ],
  },
]);

/* 17 — Bags */
cat('bags', 'حقائب', 'Bags', '#65A30D', 'bag', [
  {
    key: 'cotton-tote-bags', ar: 'حقائب قطنية', en: 'Cotton Tote Bags',
    dAr: 'حقائب قطنية قابلة لإعادة الاستخدام مطبوعة بشعارك.',
    dEn: 'Reusable cotton tote bags printed with your logo.',
    price: 22, art: true,
    opts: [
      g('اللون', 'Colour', 'select', [ v('طبيعي', 'Natural', 0, { recommended: true }), v('أسود', 'Black', 3), v('كحلي', 'Navy', 3) ]),
      g('طريقة الطباعة', 'Print method', 'select', [ v('طباعة شاشة', 'Screen print', 0, { recommended: true }), v('طباعة ألوان كاملة', 'Full colour', 6, { icon: 'gloss' }) ]),
      qtyTier([qty(25, 0), qty(50, 60, { recommended: true }), qty(100, 110), qty(250, 240)]),
    ],
  },
  {
    key: 'drawstring-bags', ar: 'حقائب برباط', en: 'Drawstring Bags',
    dAr: 'حقائب ظهر برباط خفيفة، مثالية للفعاليات الرياضية.',
    dEn: 'Lightweight drawstring backpacks, great for sports events.',
    price: 19, art: true,
    opts: [
      g('اللون', 'Colour', 'select', [ v('أسود', 'Black', 0, { recommended: true }), v('أحمر', 'Red', 0), v('أزرق', 'Blue', 0) ]),
      qtyTier([qty(25, 0), qty(50, 55, { recommended: true }), qty(100, 100)]),
    ],
  },
  {
    key: 'jute-bags', ar: 'حقائب جوت', en: 'Jute Bags',
    dAr: 'حقائب جوت طبيعية متينة وصديقة للبيئة.',
    dEn: 'Durable, eco-friendly natural jute bags.',
    price: 34, art: true,
    opts: [
      g('المقاس', 'Size', 'select', [ size('صغير', 'Small', 250, 300, 0, { recommended: true }), size('كبير', 'Large', 350, 400, 8) ]),
      qtyTier([qty(25, 0), qty(50, 90, { recommended: true }), qty(100, 170)]),
    ],
  },
]);

/* 18 — Promotional gifts */
cat('promo-gifts', 'هدايا دعائية', 'Promotional Gifts', '#E11D48', 'gift', [
  {
    key: 'branded-pens', ar: 'أقلام دعائية', en: 'Branded Pens',
    dAr: 'أقلام مطبوعة بشعارك، الهدية الدعائية الكلاسيكية.',
    dEn: 'Logo-printed pens — the classic giveaway.',
    price: 12, art: true,
    opts: [
      g('اللون', 'Colour', 'select', [ v('أزرق', 'Blue', 0, { recommended: true }), v('أسود', 'Black', 0), v('أحمر', 'Red', 0), v('فضي', 'Silver', 2) ]),
      qtyTier([qty(50, 0), qty(100, 45, { recommended: true }), qty(250, 100), qty(500, 180)]),
    ],
  },
  {
    key: 'notebooks', ar: 'دفاتر دعائية', en: 'Branded Notebooks',
    dAr: 'دفاتر بغلاف مطبوع بشعارك، هدية عملية للمكاتب والفعاليات.',
    dEn: 'Notebooks with a logo-printed cover for offices and events.',
    price: 26, art: true,
    opts: [
      g('المقاس', 'Size', 'select', [ size('A5', 'A5', 148, 210, 0, { recommended: true }), size('A6', 'A6', 105, 148, 0) ]),
      g('الغلاف', 'Cover', 'select', [ v('غلاف كرتوني', 'Card cover', 0, { icon: 'sheet', recommended: true }), v('غلاف PU جلدي', 'PU leather', 12) ]),
      qtyTier([qty(25, 0), qty(50, 90, { recommended: true }), qty(100, 170)]),
    ],
  },
  {
    key: 'lanyards', ar: 'حبال تعليق (لانيارد)', en: 'Lanyards',
    dAr: 'حبال تعليق مطبوعة للبطاقات التعريفية في المؤتمرات.',
    dEn: 'Printed lanyards for conference ID badges.',
    price: 15, art: true,
    opts: [
      g('العرض', 'Width', 'select', [ v('١٠ مم', '10 mm', 0), v('٢٠ مم', '20 mm', 0, { recommended: true }), v('٢٥ مم', '25 mm', 3) ]),
      qtyTier([qty(50, 0), qty(100, 50, { recommended: true }), qty(250, 110), qty(500, 200)]),
    ],
  },
  {
    key: 'keyrings', ar: 'ميداليات مفاتيح', en: 'Keyrings',
    dAr: 'ميداليات مفاتيح مطبوعة بشعارك بأشكال متنوعة.',
    dEn: 'Logo keyrings in a variety of shapes.',
    price: 14, art: true,
    opts: [
      g('الخامة', 'Material', 'select', [ v('أكريليك', 'Acrylic', 0, { recommended: true }), v('معدن', 'Metal', 6), v('جلد PU', 'PU leather', 5) ]),
      qtyTier([qty(50, 0), qty(100, 48, { recommended: true }), qty(250, 105)]),
    ],
  },
  {
    key: 'powerbanks', ar: 'بور بانك', en: 'Power Banks',
    dAr: 'بطاريات محمولة مطبوعة بشعارك، هدية تقنية مميزة.',
    dEn: 'Branded portable power banks — a premium tech gift.',
    price: 65, art: true,
    opts: [
      g('السعة', 'Capacity', 'select', [ v('٥٠٠٠ mAh', '5000 mAh', 0, { recommended: true }), v('١٠٠٠٠ mAh', '10000 mAh', 18) ]),
      qtyTier([qty(25, 0), qty(50, 180, { recommended: true }), qty(100, 340)]),
    ],
  },
]);

/* ------------------------------------------------------------ generic image */

// A clean, generic product tile: soft category-tinted gradient, a simple glyph,
// and the bilingual product name. No external assets — inline SVG, always loads.
const GLYPHS = {
  card: '<rect x="230" y="330" width="500" height="300" rx="24"/><path d="M300 430h360M300 500h220"/>',
  flyer: '<rect x="330" y="250" width="360" height="470" rx="16"/><path d="M390 340h240M390 420h240M390 500h160"/>',
  fold: '<path d="M300 260h420v440H300z"/><path d="M440 260v440M580 260v440"/>',
  poster: '<rect x="330" y="230" width="360" height="500" rx="12"/><circle cx="470" cy="380" r="60"/><path d="M360 640l120-130 90 80 120-140"/>',
  book: '<path d="M300 280h200q40 0 40 40v360H340q-40 0-40-40z"/><path d="M720 280H520q-40 0-40 40v360h200q40 0 40-40z"/>',
  doc: '<path d="M360 240h200l120 120v340H360z"/><path d="M560 240v120h120"/><path d="M410 470h230M410 540h230M410 610h150"/>',
  env: '<rect x="290" y="320" width="440" height="300" rx="14"/><path d="M290 340l220 170 220-170"/>',
  sticker: '<circle cx="510" cy="480" r="190"/><path d="M420 480l70 70 130-150"/>',
  banner: '<rect x="280" y="330" width="460" height="240" rx="8"/><circle cx="300" cy="350" r="10"/><circle cx="720" cy="350" r="10"/>',
  roller: '<rect x="380" y="230" width="260" height="420" rx="8"/><rect x="330" y="650" width="360" height="34" rx="12"/><path d="M510 684v70"/>',
  sign: '<rect x="320" y="280" width="380" height="280" rx="14"/><path d="M510 560v150M420 710h180"/>',
  flag: '<path d="M360 240v520"/><path d="M360 260h300l-40 90 40 90H360"/>',
  box: '<path d="M330 380l180-90 180 90-180 90z"/><path d="M330 380v230l180 90V470z"/><path d="M690 380v230l-180 90V470z"/>',
  photo: '<rect x="300" y="300" width="420" height="360" rx="16"/><circle cx="410" cy="410" r="40"/><path d="M320 620l150-150 120 110 110-90"/>',
  cup: '<path d="M360 320h280v250a90 90 0 0 1-90 90H450a90 90 0 0 1-90-90z"/><path d="M640 370h70a50 50 0 0 1 0 120h-40"/>',
  shirt: '<path d="M400 280l-110 70 60 90 60-40v260h300V450l60 40 60-90-110-70-70 40q-40 30-80 0z"/>',
  bag: '<path d="M360 380h300l30 320H330z"/><path d="M430 380a80 80 0 0 1 160 0"/>',
  gift: '<rect x="330" y="400" width="360" height="260" rx="12"/><path d="M330 470h360M510 400v260"/><path d="M510 400c-40-70-140-50-110 0M510 400c40-70 140-50 110 0"/>',
};

function tileSvg(cat, ar, en) {
  const c = cat.color;
  const glyph = GLYPHS[cat.glyph] || GLYPHS.doc;
  const short = ar.length > 22 ? ar.slice(0, 21) + '…' : ar;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1020 1020" width="1020" height="1020" role="img" aria-label="${en}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c}" stop-opacity="0.14"/>
      <stop offset="1" stop-color="${c}" stop-opacity="0.30"/>
    </linearGradient>
  </defs>
  <rect width="1020" height="1020" fill="#FFFFFF"/>
  <rect width="1020" height="1020" fill="url(#bg)"/>
  <g fill="none" stroke="${c}" stroke-width="14" stroke-linejoin="round" stroke-linecap="round" opacity="0.85">${glyph}</g>
  <text x="510" y="838" text-anchor="middle" font-family="'IBM Plex Sans Arabic',system-ui,sans-serif" font-size="52" font-weight="700" fill="#14141C" direction="rtl">${short}</text>
  <text x="510" y="902" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-size="34" font-weight="500" fill="${c}">${en}</text>
</svg>
`;
}

/* ------------------------------------------------------------ emit */

function buildRaw() {
  const categories = [];
  const items = [];
  let cid = 9001;
  let iid = 90001;

  CATS.forEach((cat, ci) => {
    categories.push({
      id: cid++,
      slug: cat.slug,
      title: cat.ar,
      title_en: cat.en,
      sort: ci,
      tag: TAG,
    });
    cat.products.forEach((p) => {
      const slug = `hp-${p.key}`;
      items.push({
        id: iid++,
        slug,
        category_slug: cat.slug,
        title: p.ar,
        title_en: p.en,
        description: p.dAr,
        description_en: p.dEn,
        rate: p.price,
        currency: 'SAR',
        unit_type: 'قطعة',
        requires_artwork: p.art !== false,
        price_mode: 'exact',
        image: `/img/hp/prod/${slug}.svg`,
        tag: TAG,
        options: p.opts,
      });
    });
  });

  return {
    success: true,
    store_config: { price_mode: 'exact', range_low_pct: 0, range_high_pct: 0 },
    categories,
    items,
  };
}

async function main() {
  const raw = buildRaw();

  // 1) raw catalog snapshot
  const rawOut = resolve(ROOT, 'src/data/helloprint-catalog.raw.json');
  await writeFile(rawOut, JSON.stringify(raw, null, 2) + '\n', 'utf8');

  // 2) generic product images
  const imgDir = resolve(ROOT, 'public/img/hp/prod');
  await rm(imgDir, { recursive: true, force: true });
  await mkdir(imgDir, { recursive: true });
  const catBySlug = new Map(CATS.map((c) => [c.slug, c]));
  for (const it of raw.items) {
    const cat = catBySlug.get(it.category_slug);
    await writeFile(resolve(imgDir, `${it.slug}.svg`), tileSvg(cat, it.title, it.title_en), 'utf8');
  }

  // 3) CRM import payload (consumed by import_helloprint.py). Same items, shaped
  //    for the token-gated Print_api::import endpoint.
  // Shape matches Print_api::import exactly: categories keyed by Arabic title,
  // items reference their category by Arabic title, bilingual name_ar/en +
  // description_ar/en, plus import_tag + price_mode. Images ride separately via
  // import_image (matched by slug); image_file is the path in the STORE repo.
  const catTitleBySlug = new Map(raw.categories.map((c) => [c.slug, c.title]));
  const payload = {
    tag: TAG,
    categories: raw.categories.map((c) => ({ name_ar: c.title, name_en: c.title_en, slug: c.slug, sort: c.sort })),
    items: raw.items.map((it) => ({
      slug: it.slug,
      category: catTitleBySlug.get(it.category_slug),
      name_ar: it.title,
      name_en: it.title_en,
      description_ar: it.description,
      description_en: it.description_en,
      rate: it.rate,
      unit_type: it.unit_type,
      requires_artwork: it.requires_artwork,
      price_mode: it.price_mode,
      import_tag: TAG,
      image_file: `public/img/hp/prod/${it.slug}.svg`,
      options: it.options,
    })),
  };
  const payloadOut = resolve(ROOT, 'scripts/helloprint-import-payload.json');
  await writeFile(payloadOut, JSON.stringify(payload, null, 2) + '\n', 'utf8');

  console.log(`[gen-helloprint] ${raw.categories.length} categories, ${raw.items.length} products.`);
  console.log(`[gen-helloprint] wrote ${rawOut}`);
  console.log(`[gen-helloprint] wrote ${raw.items.length} SVGs to ${imgDir}`);
  console.log(`[gen-helloprint] wrote ${payloadOut}`);
}

main();

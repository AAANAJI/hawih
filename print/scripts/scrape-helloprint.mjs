#!/usr/bin/env node
/**
 * scrape-helloprint.mjs — build the HelloPrint print-catalog CLONE for design/QA.
 *
 * Sources REAL data from helloprint.com's public Algolia product index
 * (names, descriptions, prices, images, quantity tiers), filters to the PRINT
 * catalog (skips promotional merch), maps it to the store's bilingual shape,
 * pairs each product with real HelloPrint-style option groups, and downloads
 * the product mockup images. Brand references (HelloPrint / PrintPortal / …)
 * are stripped from copy. Every row is tagged 'helloprint'.
 *
 * For design/QA comparison ONLY — replace with your own items before launch.
 *
 * Outputs (committed):
 *   src/data/helloprint-catalog.raw.json    → merged into catalog.json by build-catalog
 *   scripts/helloprint-import-payload.json    → CRM import payload
 *   public/img/hp/prod/<slug>.webp            → product images
 *
 * Run:  node scripts/scrape-helloprint.mjs
 */
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import https from 'node:https';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = 'helloprint';
const GBP_SAR = 4.7;
const APPID = '0W9RB66P6V';               // helloprint.com public Algolia app
const KEY = '33067ae11c635037d67ad8cf3f0a4327'; // public, search-only key

/* --------------------------------------------------------------- algolia */
function algolia(index, params) {
  const body = JSON.stringify({ params });
  return new Promise((res, rej) => {
    const req = https.request({ host: `${APPID}-dsn.algolia.net`, path: `/1/indexes/${index}/query`, method: 'POST',
      headers: { 'X-Algolia-Application-Id': APPID, 'X-Algolia-API-Key': KEY, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
      (r) => { let d = ''; r.on('data', c => d += c); r.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); });
    req.on('error', rej); req.write(body); req.end();
  });
}
function fetchBuf(url, redirects = 0) {
  return new Promise((res, rej) => https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
    if ([301,302,303,307,308].includes(r.statusCode) && r.headers.location && redirects < 4) { r.resume(); return res(fetchBuf(r.headers.location, redirects + 1)); }
    if (r.statusCode !== 200) { r.resume(); return rej(new Error('HTTP ' + r.statusCode)); }
    const c = []; r.on('data', d => c.push(d)); r.on('end', () => res(Buffer.concat(c)));
  }).on('error', rej));
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const norm = (u) => (u || '').trim().replace(/^\//, '').toLowerCase();
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const arDigits = (s) => String(s).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
const cdn = (u) => u ? (u.startsWith('//') ? 'https:' + u : u) : '';

/* --------------------------------------------------- category + options */
const CAT = {
  'Business Cards': ['business-cards','بطاقات الأعمال','Business Cards'], 'Plastic Business Cards': ['business-cards','بطاقات الأعمال','Business Cards'],
  'Leaflet Printing & Flyers': ['flyers','فلايرات','Flyers'], 'Folded Leaflets': ['folded-leaflets','مطويات','Folded Leaflets'],
  'Poster Printing': ['posters','بوسترات','Posters'], 'Booklets & Brochures': ['booklets','كتيبات وبروشورات','Booklets & Brochures'],
  'Cards & Invitations': ['cards-invitations','بطاقات ودعوات','Cards & Invitations'], 'Calendars': ['calendars','تقاويم','Calendars'],
  'Menu Cards': ['menu-cards','قوائم طعام','Menu Cards'], 'Table accessories': ['menu-cards','قوائم طعام','Menu Cards'],
  'Envelopes': ['envelopes','أظرف','Envelopes'], 'Shipping Envelopes': ['envelopes','أظرف','Envelopes'],
  'Shipping': ['packaging','تغليف وشحن','Packaging & Shipping'], 'Labels & Stickers': ['stickers','ملصقات وليبل','Stickers & Labels'],
  'Signage & Panels': ['signs','لوحات ولافتات','Signs & Panels'], 'Banners': ['banners','بنرات','Banners'],
  'Roller Banners': ['roller-banners','رول أب','Roller Banners'], 'Flag Printing': ['flags','أعلام','Flags'], 'Beach Flags': ['flags','أعلام','Flags'],
  'Gift Boxes': ['packaging','تغليف وشحن','Packaging & Shipping'], 'Packaging Accessories': ['packaging','تغليف وشحن','Packaging & Shipping'],
  'Bottle Packaging': ['packaging','تغليف وشحن','Packaging & Shipping'], 'Printed Food Packaging': ['packaging','تغليف وشحن','Packaging & Shipping'],
  'Paper Bags': ['packaging','تغليف وشحن','Packaging & Shipping'], 'Photo Gifts': ['photo','هدايا وصور','Photo Products'],
  'Photo on Canvas & Wall Decoration': ['photo','هدايا وصور','Photo Products'], 'Sticky Notes & Memo Blocks': ['notepads','دفاتر ملاحظات','Notepads'],
  'Notepads': ['notepads','دفاتر ملاحظات','Notepads'], 'NCR Pads': ['notepads','دفاتر ملاحظات','Notepads'],
  'Bookmarks': ['bookmarks','فواصل كتب','Bookmarks'], 'Exhibition Accessories': ['exhibition','معارض','Exhibition'], 'Badges': ['badges','بادجات','Badges'],
};
const PRINT_GP = new Set(['Promotional Products','Signage & Outdoor Products','Stationery','Packaging','Photo Products','Business Cards','Office Supplies']);
const PRINT_PAR = new Set(['Menu Cards','Table accessories','Cards & Invitations','Exhibition Accessories','Roller Banners']);
const DROP_PAR = new Set(['Balloons','Outdoor Furniture','Chairs']);

const v = (ar,en,d=0,x={}) => ({ label_ar:ar, label_en:en, price_delta:d, ...x });
const g = (ar,en,vals) => ({ name_ar:ar, name_en:en, type:'select', values:vals });
const dim = (ar,en,w,h,d=0,x={}) => v(`${ar} · ${w}×${h} مم`, `${en} · ${w}×${h} mm`, d, x);
const SIZE=(vals)=>g('المقاس','Size',vals), PAPER=(vals)=>g('نوع الورق','Paper',vals), FINISH=(vals)=>g('التشطيب','Finishing',vals);
const SIDES=()=>g('الطباعة','Printed sides',[v('وجه واحد','Single-sided',0,{icon:'single'}),v('وجهين','Double-sided',12,{icon:'double',recommended:true})]);
const CORNERS=()=>g('الزوايا','Corners',[v('زوايا قائمة','Square',0,{icon:'straight'}),v('زوايا دائرية','Rounded',8,{icon:'rounded'})]);
const PAPER_STD=()=>PAPER([v('٣٥٠ جرام ساتان','350 gsm silk',0,{icon:'sheet',recommended:true}),v('٤٠٠ جرام فاخر','400 gsm premium',10,{icon:'sheet'}),v('٣٠٠ جرام غير مطلي','300 gsm uncoated',0,{icon:'sheet'})]);
const FINISH_STD=()=>FINISH([v('بدون','None',0,{icon:'none'}),v('لامينيشن مط','Matte lamination',18,{icon:'matt',recommended:true}),v('لامينيشن لامع','Gloss lamination',18,{icon:'gloss'})]);
const OPT = {
  'business-cards': ()=>[SIZE([dim('قياسي','Standard',85,55,0,{recommended:true}),dim('أمريكي','American',90,50,4),dim('مربع','Square',55,55,6)]),PAPER_STD(),FINISH_STD(),SIDES(),CORNERS()],
  'flyers': ()=>[SIZE([dim('A6','A6',105,148),dim('A5','A5',148,210,8,{recommended:true}),dim('DL','DL',99,210,8),dim('A4','A4',210,297,18)]),PAPER([v('١٣٥ جرام لامع','135 gsm gloss',0,{icon:'sheet'}),v('١٧٠ جرام ساتان','170 gsm silk',10,{icon:'sheet',recommended:true}),v('٣٠٠ جرام كرتوني','300 gsm card',22,{icon:'sheet'})]),SIDES()],
  'folded-leaflets': ()=>[SIZE([dim('A4 مطوي','A4 folded',210,297,0,{recommended:true}),dim('A5 مطوي','A5 folded',148,210)]),g('نوع الطي','Fold',[v('طي ثلاثي','Tri-fold',0,{icon:'fold',recommended:true}),v('طي نصفي','Half-fold',0),v('طي Z','Z-fold',4)]),FINISH_STD()],
  'posters': ()=>[SIZE([dim('A3','A3',297,420),dim('A2','A2',420,594,12,{recommended:true}),dim('A1','A1',594,841,28),dim('A0','A0',841,1189,55)]),PAPER([v('١٣٥ جرام لامع','135 gsm gloss',0,{icon:'sheet'}),v('٢٥٠ جرام لامع','250 gsm gloss',10,{icon:'sheet',recommended:true}),v('١٩٠ جرام ورق صور','190 gsm photo',22,{icon:'sheet'})]),FINISH_STD()],
  'booklets': ()=>[SIZE([dim('A5','A5',148,210,0,{recommended:true}),dim('A4','A4',210,297,30)]),g('عدد الصفحات','Pages',[v('٨ صفحات','8 pages',0,{recommended:true}),v('١٦ صفحة','16 pages',40),v('٢٤ صفحة','24 pages',80),v('٣٢ صفحة','32 pages',120)]),g('التجليد','Binding',[v('دبوس','Stapled',0,{recommended:true}),v('غراء','Perfect bound',60)])],
  'cards-invitations': ()=>[SIZE([dim('A6','A6',105,148,0,{recommended:true}),dim('DL','DL',99,210),dim('مربع','Square',148,148,6)]),PAPER_STD(),FINISH_STD(),CORNERS()],
  'calendars': ()=>[SIZE([dim('A4','A4',210,297,0,{recommended:true}),dim('A3','A3',297,420,20)]),g('النوع','Type',[v('حائط','Wall',0,{recommended:true}),v('مكتب','Desk',0),v('شهري','Monthly',6)])],
  'menu-cards': ()=>[SIZE([dim('A4','A4',210,297,0,{recommended:true}),dim('A5','A5',148,210),dim('DL','DL',99,210)]),FINISH_STD(),SIDES()],
  'envelopes': ()=>[SIZE([dim('DL','DL',110,220,0,{recommended:true}),dim('C5','C5',162,229,8),dim('C4','C4',229,324,20)]),g('الطباعة','Print',[v('لون واحد','1 colour',0,{recommended:true}),v('ألوان كاملة','Full colour',18,{icon:'gloss'})])],
  'stickers': ()=>[g('الشكل','Shape',[v('دائري','Round',0,{icon:'rounded',recommended:true}),v('مربع','Square',0,{icon:'straight'}),v('مستطيل','Rectangle',0,{icon:'straight'})]),SIZE([dim('صغير','Small',40,40),dim('متوسط','Medium',60,60,6,{recommended:true}),dim('كبير','Large',95,95,14)]),g('الخامة','Material',[v('ورق لاصق','Paper',0,{icon:'sheet',recommended:true}),v('PVC مقاوم للماء','Waterproof PVC',12,{icon:'sheet'}),v('شفاف','Transparent',14,{icon:'gloss'})]),FINISH([v('لامع','Gloss',0,{icon:'gloss',recommended:true}),v('مط','Matte',0,{icon:'matt'})])],
  'signs': ()=>[g('السماكة','Thickness',[v('٣ مم','3 mm',0,{icon:'sheet',recommended:true}),v('٥ مم','5 mm',15,{icon:'sheet'}),v('١٠ مم','10 mm',35,{icon:'sheet'})]),SIZE([dim('A2','A2',420,594,0,{recommended:true}),dim('A1','A1',594,841,25),dim('A0','A0',841,1189,55)]),g('الخامة','Material',[v('فوم PVC','Foamex PVC',0,{recommended:true}),v('ألمنيوم','Aluminium',40),v('أكريليك','Acrylic',35)])],
  'banners': ()=>[SIZE([dim('١×١ م','1×1 m',1000,1000,0),dim('٢×١ م','2×1 m',2000,1000,30,{recommended:true}),dim('٣×١ م','3×1 m',3000,1000,60),dim('٤×١ م','4×1 m',4000,1000,90)]),g('الخامة','Material',[v('فليكس ٣١٠','Flex 310 gsm',0,{icon:'sheet',recommended:true}),v('فليكس ٤٤٠','Flex 440 gsm',20,{icon:'sheet'}),v('شبكي','Mesh',10)]),g('التشطيب','Finishing',[v('حلقات معدنية','Eyelets',0,{recommended:true}),v('جيوب للأنبوب','Pole pockets',12)])],
  'roller-banners': ()=>[SIZE([dim('صغير','Small',850,2000),dim('متوسط','Medium',1000,2000,25,{recommended:true}),dim('كبير','Large',1200,2000,55)]),g('القاعدة','Base',[v('اقتصادية فضية','Silver budget',0,{recommended:true}),v('كرتون صديقة للبيئة','Eco cardboard',10),v('بريميوم','Premium',45)])],
  'flags': ()=>[g('النوع','Type',[v('ريشة','Feather',0,{recommended:true}),v('دمعة','Teardrop',0),v('مستطيل','Rectangle',0)]),g('المقاس','Size',[v('صغير ٢٫٥م','Small 2.5 m',0),v('متوسط ٣٫٥م','Medium 3.5 m',40,{recommended:true}),v('كبير ٤٫٥م','Large 4.5 m',90)]),g('القاعدة','Base',[v('صليبية','Cross base',0,{recommended:true}),v('قاعدة مياه','Water base',30),v('وتد أرضي','Ground spike',0)]),SIDES()],
  'packaging': ()=>[SIZE([dim('صغير','Small',100,100,0,{recommended:true}),dim('متوسط','Medium',150,150,30),dim('كبير','Large',220,220,70)]),FINISH_STD()],
  'photo': ()=>[SIZE([dim('٣٠×٣٠','30×30',300,300,0,{recommended:true}),dim('٤٠×٦٠','40×60',400,600,30),dim('٦٠×٩٠','60×90',600,900,80)])],
  'notepads': ()=>[SIZE([dim('A5','A5',148,210,0,{recommended:true}),dim('A6','A6',105,148),dim('A4','A4',210,297,14)]),g('عدد الأوراق','Sheets',[v('٢٥ ورقة','25 sheets',0,{recommended:true}),v('٥٠ ورقة','50 sheets',12),v('١٠٠ ورقة','100 sheets',26)])],
  'bookmarks': ()=>[SIZE([dim('قياسي','Standard',52,148,0,{recommended:true})]),PAPER_STD(),FINISH_STD(),CORNERS()],
  'exhibition': ()=>[SIZE([dim('متوسط','Medium',1000,2000,0,{recommended:true})])],
  'badges': ()=>[g('المقاس','Size',[v('٢٥ مم','25 mm',0,{recommended:true}),v('٣٨ مم','38 mm',2),v('٥٨ مم','58 mm',4)])],
};
const genericOpt = () => [SIZE([dim('قياسي','Standard',210,297,0,{recommended:true})]), PAPER_STD()];

function cleanDesc(d) {
  if (!d) return '';
  let t = String(d).replace(/\{\{\s*shop_name\s*\}\}/gi, 'Hawih')
    .replace(/\bhello\s*print\b/gi, 'Hawih').replace(/\bprint\s*portals?\b/gi, 'Hawih').replace(/\bmerchmaker\b/gi, 'Hawih')
    .replace(/\*\*(.*?)\*\*/g, '$1').replace(/[*_#>`]/g, '').replace(/\bHawih(?:'s|’s)?\s+Hawih\b/g, 'Hawih').replace(/\s+/g, ' ').trim();
  return t.length > 400 ? t.slice(0, 397).trim() + '…' : t;
}
function qtyOption(printrun) {
  const nums = (Array.isArray(printrun) ? printrun : []).map(s => parseInt(String(s).replace(/[.,]/g, ''), 10)).filter(n => n > 0);
  if (!nums.length) return null;
  const uniq = [...new Set(nums)].sort((a, b) => a - b);
  const pick = uniq.length <= 5 ? uniq : [uniq[0], uniq[Math.floor(uniq.length*0.25)], uniq[Math.floor(uniq.length*0.5)], uniq[Math.floor(uniq.length*0.75)], uniq[uniq.length-1]];
  return { name_ar:'الكمية', name_en:'Quantity', type:'tier', values: pick.map((n,i)=>({ label_ar:`${arDigits(n.toLocaleString('en-US'))} نسخة`, label_en:`${n.toLocaleString('en-US')} pcs`, price_delta:0, ...(i===1?{recommended:true}:{}) })) };
}

/* --------------------------------------------------------------- main */
async function main() {
  console.log('[scrape] fetching product index + category map from helloprint Algolia…');
  const prod = (await algolia('search_co_en', 'query=&hitsPerPage=1000')).hits.filter(h => h.type === 'product');
  const cat = new Map();
  const addPresta = (hits) => { for (const h of hits) { const p = h.parents || {}; const c = { g: p.grandparent?.name, pa: p.parent?.name };
    for (const k of [norm(h.url), norm(h.slug)]) if (k) cat.set(k, c); } };
  addPresta((await algolia('presta_en_gb', 'query=&hitsPerPage=1000')).hits);
  for (const t of ['business card','flyer','leaflet','poster','booklet','brochure','letterhead','notepad','envelope','sticker','label','banner','roller','sign','flag','folder','certificate','bookmark','invitation','calendar','canvas','photo','packaging','box','menu','pavement','ncr','plastic business','beach flag','gift box']) {
    addPresta((await algolia('presta_en_gb', `query=${encodeURIComponent(t)}&hitsPerPage=100`)).hits); await sleep(100);
  }

  const categories = []; const catIndex = new Map(); let cid = 9001, iid = 90001;
  const ensureCat = (par) => { const m = CAT[par]; if (!m) return null; const full = `hp-${m[0]}`;
    if (!catIndex.has(full)) { catIndex.set(full, { id: cid++, slug: full, title: m[1], title_en: m[2], sort: catIndex.size, tag: TAG }); categories.push(catIndex.get(full)); }
    return catIndex.get(full); };

  const items = [], imgJobs = [], seen = new Set();
  for (const h of prod) {
    const u = norm(h.url || h.producturl); const c = cat.get(u); if (!c) continue;
    if (!(PRINT_GP.has(c.g) || PRINT_PAR.has(c.pa)) || DROP_PAR.has(c.pa)) continue;
    const store = ensureCat(c.pa); if (!store) continue;
    const slug = 'hp-' + (u || slugify(h.name)); if (seen.has(slug)) continue; seen.add(slug);
    const nameEn = (h.title || h.name || '').trim();
    const price = Math.max(5, Math.round((Number(h.price) || 10) * GBP_SAR));
    const key = store.slug.replace(/^hp-/, '');
    const opts = (OPT[key] ? OPT[key]() : genericOpt()).slice(); const q = qtyOption(h.printrun_options); if (q) opts.push(q);
    const img = cdn(h.search_image); const localImg = `/img/hp/prod/${slug}.webp`;
    if (img) imgJobs.push({ url: img + (img.includes('?') ? '&' : '?') + 'w=760&fm=webp&q=78&bg=rgb:ffffff&fit=pad', file: resolve(ROOT, `public${localImg}`) });
    items.push({ id: iid++, slug, category_slug: store.slug, title: nameEn, title_en: nameEn,
      description: cleanDesc(h.description), description_en: cleanDesc(h.description),
      rate: price, currency: 'SAR', unit_type: 'قطعة', requires_artwork: true, price_mode: 'exact',
      image: img ? localImg : '', tag: TAG, options: opts });
  }

  const raw = { success: true, store_config: { price_mode: 'exact', range_low_pct: 0, range_high_pct: 0 }, categories, items };
  await writeFile(resolve(ROOT, 'src/data/helloprint-catalog.raw.json'), JSON.stringify(raw, null, 2) + '\n');
  const catTitle = new Map(categories.map(c => [c.slug, c.title]));
  const payload = { tag: TAG, categories: categories.map(c => ({ name_ar: c.title, name_en: c.title_en, slug: c.slug, sort: c.sort })),
    items: items.map(it => ({ slug: it.slug, category: catTitle.get(it.category_slug), name_ar: it.title, name_en: it.title_en,
      description_ar: it.description, description_en: it.description_en, rate: it.rate, unit_type: it.unit_type,
      requires_artwork: it.requires_artwork, price_mode: it.price_mode, import_tag: TAG,
      image_file: it.image ? `public${it.image}` : '', options: it.options })) };
  await writeFile(resolve(ROOT, 'scripts/helloprint-import-payload.json'), JSON.stringify(payload, null, 2) + '\n');
  console.log(`[scrape] ${categories.length} categories, ${items.length} products.`);

  // images
  const dir = resolve(ROOT, 'public/img/hp/prod'); await rm(dir, { recursive: true, force: true }); await mkdir(dir, { recursive: true });
  let ok = 0, fail = 0;
  for (let i = 0; i < imgJobs.length; i += 8) {
    await Promise.all(imgJobs.slice(i, i + 8).map(async (j) => { try { const b = await fetchBuf(j.url); if (b.length < 200) throw 0; await writeFile(j.file, b); ok++; } catch { fail++; } }));
    process.stdout.write('.');
  }
  console.log(`\n[scrape] images: ${ok} downloaded, ${fail} failed.`);
}
main().catch(e => { console.error('[scrape] failed:', e.message); process.exit(1); });

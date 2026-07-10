/**
 * strings.ts — single i18n source for ALL store CHROME copy.
 * Product / category copy comes from the catalog fields, NOT here.
 *
 * Usage in .astro:
 *   import { t } from '@lib/strings';
 *   t('nav.products', locale)  // -> "المنتجات" | "Products"
 *
 * Add a key by extending STRINGS with { ar, en }. Keep both filled.
 */
import type { Locale } from './format';

type Pair = { ar: string; en: string };

export const STRINGS = {
  // Brand / global
  'brand.name': { ar: 'مطبعة هوية', en: 'Hawih Print' },
  'brand.tagline': { ar: 'طباعة استثنائية لعلامتك', en: 'Exceptional printing for your brand' },

  // Header nav
  'nav.products': { ar: 'المنتجات', en: 'Products' },
  'nav.track': { ar: 'تتبّع طلبك', en: 'Track Order' },
  'nav.account': { ar: 'حسابي', en: 'My Account' },
  'nav.cart': { ar: 'السلة', en: 'Cart' },
  'nav.home': { ar: 'الرئيسية', en: 'Home' },
  'nav.menu': { ar: 'القائمة', en: 'Menu' },
  'nav.close': { ar: 'إغلاق', en: 'Close' },
  'nav.allCategories': { ar: 'كل الأقسام', en: 'All Categories' },
  'nav.allProducts': { ar: 'كل المنتجات', en: 'All products' },

  // HawihStrip
  'strip.text': { ar: 'مطبعة هوية جزء من هوية للأعمال', en: 'Hawih Print is part of Hawih Business' },
  'strip.cta': { ar: 'تعرّف على هوية', en: 'Discover Hawih' },
  'strip.dismiss': { ar: 'إخفاء الشريط', en: 'Dismiss' },

  // Home hero
  'hero.eyebrow': { ar: 'مطبعة رقمية · الرياض', en: 'Digital Print House · Riyadh' },
  'hero.title': { ar: 'مطبعة هوية — طباعة استثنائية لعلامتك', en: 'Hawih Print — exceptional printing for your brand' },
  'hero.subtitle': {
    ar: 'كروت أعمال، ملصقات، علب وأكياس، ومطبوعات مناسبات بجودة راقية وتنفيذ سريع وتوصيل لكل مناطق المملكة.',
    en: 'Business cards, stickers, boxes, bags and occasion prints — premium quality, fast turnaround, delivered across the Kingdom.',
  },
  'hero.ctaPrimary': { ar: 'تصفّح المنتجات', en: 'Browse products' },
  'hero.ctaSecondary': { ar: 'كيف نطبع', en: 'How it works' },

  // Sections
  'home.categoriesTitle': { ar: 'تسوّق حسب القسم', en: 'Shop by category' },
  'home.categoriesSub': { ar: 'اختر القسم الذي يناسب مشروعك', en: 'Pick the category that fits your project' },
  'home.featuredTitle': { ar: 'الأكثر طلباً', en: 'Most ordered' },
  'home.featuredSub': { ar: 'منتجات مختارة يبدأ تجهيزها فوراً', en: 'Selected products, ready to produce' },
  'home.stepsTitle': { ar: 'كيف تطلب', en: 'How to order' },
  'home.stepsSub': { ar: 'ثلاث خطوات بسيطة من التصميم إلى بابك', en: 'Three simple steps from design to your door' },
  'home.viewAll': { ar: 'عرض الكل', en: 'View all' },

  // How-to steps
  'step.1.title': { ar: 'اختر المنتج والمواصفات', en: 'Choose product & specs' },
  'step.1.body': { ar: 'حدّد المقاس والخامة والكمية المناسبة لمشروعك.', en: 'Select the size, material and quantity for your project.' },
  'step.2.title': { ar: 'ارفع تصميمك', en: 'Upload your artwork' },
  'step.2.body': { ar: 'أرفق ملف التصميم بصيغة PDF أو صورة عالية الدقة عند إتمام الطلب.', en: 'Attach your design as a PDF or high-resolution image at checkout.' },
  'step.3.title': { ar: 'نطبع ونوصّل', en: 'We print & deliver' },
  'step.3.body': { ar: 'ننفّذ طلبك بعناية ونوصّله إلى بابك في كل مناطق المملكة.', en: 'We produce your order with care and deliver it to your door nationwide.' },

  // Trust strip
  'trust.tax': { ar: 'فاتورة ضريبية', en: 'Tax invoice' },
  'trust.bank': { ar: 'تحويل بنكي', en: 'Bank transfer' },
  'trust.whatsapp': { ar: 'تأكيد عبر واتساب', en: 'WhatsApp confirmation' },
  'trust.turnaround': { ar: 'تنفيذ 3-7 أيام', en: '3-7 day turnaround' },

  // Product listing / product page
  'product.startingFrom': { ar: 'يبدأ من', en: 'Starting from' },
  'product.from': { ar: 'من', en: 'From' },
  'product.addToCart': { ar: 'أضف إلى السلة', en: 'Add to cart' },
  'product.added': { ar: 'تمت الإضافة', en: 'Added' },
  'product.quantity': { ar: 'الكمية', en: 'Quantity' },
  'product.artworkNote': { ar: 'ارفع ملف التصميم عند إتمام الطلب.', en: 'Upload your artwork at checkout.' },
  'product.artworkAfter': { ar: 'سترفع ملف التصميم بعد تقديم الطلب — عند الدفع أو من صفحة الطلب.', en: 'You’ll upload your design after ordering — at checkout or from your order page.' },
  'product.specs': { ar: 'المواصفات', en: 'Specifications' },
  'product.spec.category': { ar: 'القسم', en: 'Category' },
  'product.spec.unit': { ar: 'وحدة الطلب', en: 'Order unit' },
  'product.spec.artwork': { ar: 'يتطلب تصميماً', en: 'Artwork required' },
  'product.spec.turnaround': { ar: 'مدة التنفيذ', en: 'Turnaround' },
  'product.turnaroundValue': { ar: '3-7 أيام عمل', en: '3-7 business days' },
  'product.yes': { ar: 'نعم', en: 'Yes' },
  'product.related': { ar: 'منتجات ذات صلة', en: 'Related products' },
  'product.description': { ar: 'الوصف', en: 'Description' },

  // PriceBox
  'price.taxNote': { ar: 'شامل الضريبة تُحتسب عند الفوترة', en: 'VAT calculated at invoicing' },
  'price.estimateNote': { ar: 'سعر تقريبي — يُؤكد السعر النهائي بعد مراجعة الطلب', en: 'Estimated price — final price confirmed after order review' },

  // Search
  'search.placeholder': { ar: 'ابحث عن منتج… كروت، ملصقات، علب', en: 'Search products… cards, stickers, boxes' },
  'search.label': { ar: 'البحث في المنتجات', en: 'Search products' },
  'search.viewAll': { ar: 'عرض كل النتائج', en: 'View all results' },
  'search.noResults': { ar: 'لا توجد نتائج مطابقة', en: 'No matching results' },

  // All-products page
  'products.title': { ar: 'كل المنتجات', en: 'All products' },
  'products.sub': { ar: 'تصفّح كامل منتجات المطبعة وصفِّها حسب القسم أو السعر.', en: 'Browse the full catalog and filter by category or price.' },
  'products.count': { ar: 'منتج', en: 'products' },
  'products.filterAll': { ar: 'الكل', en: 'All' },
  'products.sort': { ar: 'الترتيب', en: 'Sort' },
  'products.sort.default': { ar: 'الترتيب الافتراضي', en: 'Default order' },
  'products.sort.priceAsc': { ar: 'السعر: من الأقل', en: 'Price: low to high' },
  'products.sort.priceDesc': { ar: 'السعر: من الأعلى', en: 'Price: high to low' },
  'products.sort.name': { ar: 'الاسم', en: 'Name' },
  'products.empty.title': { ar: 'لا توجد نتائج', en: 'No results' },
  'products.empty.body': { ar: 'جرّب كلمة بحث أخرى أو امسح الفلاتر.', en: 'Try another search term or clear the filters.' },
  'products.clear': { ar: 'مسح الفلاتر', en: 'Clear filters' },

  // Qty stepper a11y
  'qty.decrease': { ar: 'تقليل الكمية', en: 'Decrease quantity' },
  'qty.increase': { ar: 'زيادة الكمية', en: 'Increase quantity' },

  // Home promos
  'promo1.kicker': { ar: 'الأكثر مبيعاً', en: 'Best seller' },
  'promo1.title': { ar: 'ملصقات بتصميمك الخاص', en: 'Stickers with your own design' },
  'promo1.body': { ar: 'مقاسات وخامات متعددة، قصّ حسب الشكل، وتنفيذ سريع.', en: 'Multiple sizes and materials, custom die-cut, fast turnaround.' },
  'promo1.cta': { ar: 'اطلب ملصقاتك', en: 'Order stickers' },
  'promo2.kicker': { ar: 'انطباع أول لا يُنسى', en: 'A first impression that lasts' },
  'promo2.title': { ar: 'كروت أعمال فاخرة', en: 'Premium business cards' },
  'promo2.body': { ar: 'ورق فاخر وتشطيبات مميزة تليق بعلامتك التجارية.', en: 'Premium stocks and finishes worthy of your brand.' },
  'promo2.cta': { ar: 'تصفّح الكروت', en: 'Browse cards' },

  // Design-help banner
  'banner.title': { ar: 'ما عندك تصميم جاهز؟', en: "Don't have a design ready?" },
  'banner.body': { ar: 'فريق التصميم لدينا يجهّز لك تصميماً احترافياً يليق بمطبوعاتك — تواصل معنا وخلّ الباقي علينا.', en: 'Our design team will prepare a professional design for your prints — get in touch and leave the rest to us.' },
  'banner.cta': { ar: 'اطلب تصميماً', en: 'Request a design' },

  // Header / nav extras
  'nav.about': { ar: 'من نحن', en: 'About' },
  'nav.contact': { ar: 'تواصل معنا', en: 'Contact' },
  'nav.faq': { ar: 'الأسئلة الشائعة', en: 'FAQ' },
  'nav.categories': { ar: 'الأقسام', en: 'Categories' },

  // Mini cart (slide-in)
  'minicart.viewCart': { ar: 'عرض السلة', en: 'View cart' },

  // About page
  'about.title': { ar: 'من نحن', en: 'About us' },
  'about.sub': { ar: 'مطبعة هوية — الذراع الطباعية لهوية للأعمال.', en: 'Hawih Print — the printing arm of Hawih Business.' },
  'about.p1': { ar: 'نؤمن أن المطبوعات ليست ورقاً وحبراً، بل امتداد لهوية علامتك التجارية. في مطبعة هوية نجمع بين الجودة العالية والتنفيذ السريع لنقدّم مطبوعات تليق بمنشأتك — من كروت الأعمال والملصقات إلى العلب والأكياس ومطبوعات المناسبات.', en: 'We believe print is not just paper and ink — it is an extension of your brand. At Hawih Print we combine high quality with fast turnaround to deliver prints worthy of your business, from business cards and stickers to boxes, bags and occasion prints.' },
  'about.p2': { ar: 'نخدم المنشآت والأفراد في جميع مناطق المملكة، مع فواتير ضريبية، تأكيد عبر واتساب، وتوصيل موثوق حتى باب العميل.', en: 'We serve businesses and individuals across the Kingdom, with tax invoices, WhatsApp confirmation, and reliable door-to-door delivery.' },
  'about.stat1.n': { ar: '+٢٠٠', en: '200+' },
  'about.stat1.l': { ar: 'منتج طباعي', en: 'Print products' },
  'about.stat2.n': { ar: '٣-٧', en: '3–7' },
  'about.stat2.l': { ar: 'أيام تنفيذ', en: 'Days turnaround' },
  'about.stat3.n': { ar: '١٠٠٪', en: '100%' },
  'about.stat3.l': { ar: 'فاتورة ضريبية', en: 'Tax invoiced' },
  'about.cta': { ar: 'تصفّح منتجاتنا', en: 'Browse our products' },

  // Contact page
  'contact.title': { ar: 'تواصل معنا', en: 'Contact us' },
  'contact.sub': { ar: 'فريقنا جاهز للرد على استفساراتك ومساعدتك في طلبك.', en: 'Our team is ready to answer your questions and help with your order.' },
  'contact.whatsapp.title': { ar: 'واتساب', en: 'WhatsApp' },
  'contact.whatsapp.body': { ar: 'أسرع طريقة للتواصل — رد خلال ساعات العمل.', en: 'The fastest way to reach us — replies during working hours.' },
  'contact.whatsapp.cta': { ar: 'ابدأ محادثة', en: 'Start a chat' },
  'contact.phone.title': { ar: 'اتصال هاتفي', en: 'Phone' },
  'contact.phone.body': { ar: 'من الأحد إلى الخميس، ٩ صباحاً – ٦ مساءً.', en: 'Sunday to Thursday, 9am – 6pm.' },
  'contact.phone.cta': { ar: 'اتصل الآن', en: 'Call now' },
  'contact.email.title': { ar: 'البريد الإلكتروني', en: 'Email' },
  'contact.email.body': { ar: 'للاستفسارات التفصيلية وطلبات الشركات.', en: 'For detailed enquiries and corporate orders.' },
  'contact.email.cta': { ar: 'أرسل بريداً', en: 'Send an email' },

  // FAQ page
  'faq.title': { ar: 'الأسئلة الشائعة', en: 'FAQ' },
  'faq.sub': { ar: 'إجابات سريعة عن أكثر ما يسألنا عنه عملاؤنا.', en: 'Quick answers to what our customers ask most.' },
  'faq.q1': { ar: 'كم تستغرق مدة التنفيذ والتوصيل؟', en: 'How long do production and delivery take?' },
  'faq.a1': { ar: 'التنفيذ من ٣ إلى ٧ أيام عمل حسب المنتج والكمية، والتوصيل من ٢ إلى ٥ أيام لجميع مناطق المملكة.', en: 'Production takes 3–7 business days depending on the product and quantity, and delivery takes 2–5 days across the Kingdom.' },
  'faq.q2': { ar: 'ما صيغ ملفات التصميم المقبولة؟', en: 'Which artwork file formats do you accept?' },
  'faq.a2': { ar: 'نقبل PDF وAI وEPS وPNG وJPG وZIP حتى ٢٥ ميجابايت، بدقة لا تقل عن ٣٠٠ نقطة/بوصة وبنظام ألوان CMYK.', en: 'We accept PDF, AI, EPS, PNG, JPG and ZIP up to 25MB, at 300dpi minimum in CMYK.' },
  'faq.q3': { ar: 'كيف يتم الدفع؟', en: 'How does payment work?' },
  'faq.a3': { ar: 'بعد تأكيد طلبك نصدر فاتورة ضريبية يتم سدادها عبر التحويل البنكي، ثم يبدأ التنفيذ فوراً.', en: 'After confirming your order we issue a tax invoice paid by bank transfer, then production starts immediately.' },
  'faq.q4': { ar: 'ليس لدي تصميم جاهز، هل تصممون لي؟', en: "I don't have a design — can you design for me?" },
  'faq.a4': { ar: 'نعم، فريق التصميم لدينا يجهّز لك تصميماً احترافياً برسوم رمزية — تواصل معنا عبر واتساب.', en: 'Yes — our design team prepares a professional design for a small fee. Reach us on WhatsApp.' },
  'faq.q5': { ar: 'هل أستطيع تتبع حالة طلبي؟', en: 'Can I track my order status?' },
  'faq.a5': { ar: 'نعم، من صفحة حسابي تجد حالة كل طلب خطوة بخطوة من الاستلام حتى التسليم، مع فاتورتك.', en: 'Yes — the My Account page shows each order step by step from received to delivered, along with your invoice.' },
  'faq.q6': { ar: 'هل تصدرون فواتير ضريبية؟', en: 'Do you issue tax invoices?' },
  'faq.a6': { ar: 'نعم، جميع الطلبات تشمل فاتورة ضريبية رسمية باسم منشأتك أو باسمك الشخصي.', en: 'Yes — every order includes an official tax invoice in your company or personal name.' },

  // Category page
  'category.productsCount': { ar: 'منتج', en: 'products' },
  'category.empty.title': { ar: 'لا توجد منتجات بعد', en: 'No products yet' },
  'category.empty.body': { ar: 'نعمل على إضافة منتجات هذا القسم قريباً.', en: 'We are adding products to this category soon.' },

  // Cart
  'cart.title': { ar: 'سلة الطلبات', en: 'Your cart' },
  'cart.empty.title': { ar: 'سلتك فارغة', en: 'Your cart is empty' },
  'cart.empty.body': { ar: 'تصفّح منتجاتنا وأضف ما يناسب مشروعك.', en: 'Browse our products and add what suits your project.' },
  'cart.empty.cta': { ar: 'ابدأ التسوّق', en: 'Start shopping' },
  'cart.remove': { ar: 'إزالة', en: 'Remove' },
  'cart.subtotal': { ar: 'المجموع الفرعي', en: 'Subtotal' },
  'cart.taxNote': { ar: 'تُضاف ضريبة القيمة المضافة عند إصدار الفاتورة.', en: 'VAT is added when the invoice is issued.' },
  'cart.checkout': { ar: 'متابعة الدفع', en: 'Proceed to checkout' },
  'cart.continue': { ar: 'مواصلة التسوّق', en: 'Continue shopping' },
  'cart.note': { ar: 'ملاحظة', en: 'Note' },
  'cart.itemsCount': { ar: 'عنصر', en: 'items' },

  // Artwork upload
  'upload.title': { ar: 'ملفات التصميم', en: 'Artwork files' },
  'upload.drop': { ar: 'اسحب الملفات هنا أو اضغط للاختيار', en: 'Drag files here or click to browse' },
  'upload.hint': { ar: 'JPG, PNG, PDF, ZIP, AI, EPS — حتى 25 ميجابايت', en: 'JPG, PNG, PDF, ZIP, AI, EPS — up to 25MB' },
  'upload.errType': { ar: 'صيغة الملف غير مدعومة', en: 'Unsupported file type' },
  'upload.errSize': { ar: 'حجم الملف يتجاوز 25 ميجابايت', en: 'File exceeds 25MB' },
  'upload.remove': { ar: 'حذف الملف', en: 'Remove file' },

  // Footer
  'footer.blurb': {
    ar: 'مطبعة هوية تقدّم طباعة راقية للعلامات التجارية والمنشآت في المملكة، بجودة عالية وتنفيذ موثوق.',
    en: 'Hawih Print delivers premium printing for brands and businesses across the Kingdom — high quality, reliably produced.',
  },
  'footer.categories': { ar: 'الأقسام', en: 'Categories' },
  'footer.help': { ar: 'المساعدة', en: 'Help' },
  'footer.contact': { ar: 'تواصل معنا', en: 'Contact' },
  'footer.privacy': { ar: 'سياسة الخصوصية', en: 'Privacy Policy' },
  'footer.terms': { ar: 'الشروط والأحكام', en: 'Terms & Conditions' },
  'footer.shipping': { ar: 'الشحن والاسترجاع', en: 'Shipping & Returns' },
  'footer.track': { ar: 'تتبّع الطلب', en: 'Track order' },
  'footer.account': { ar: 'حسابي', en: 'My account' },
  'footer.email': { ar: 'البريد الإلكتروني', en: 'Email' },
  'footer.whatsapp': { ar: 'واتساب', en: 'WhatsApp' },
  'footer.phone': { ar: 'الهاتف', en: 'Phone' },
  'footer.trustNote': { ar: 'فاتورة ضريبية · تحويل بنكي', en: 'Tax invoice · Bank transfer' },
  'footer.rights': { ar: 'جميع الحقوق محفوظة', en: 'All rights reserved' },
  'footer.mainSite': { ar: 'الموقع الرئيسي hawih.com.sa', en: 'Main site hawih.com.sa' },

  // Auth / account (placeholders + reused chrome)
  'auth.login': { ar: 'تسجيل الدخول', en: 'Sign in' },
  'auth.signup': { ar: 'إنشاء حساب', en: 'Create account' },
  'auth.logout': { ar: 'تسجيل الخروج', en: 'Sign out' },

  // Placeholder page titles (second agent fleshes these out)
  'page.checkout': { ar: 'إتمام الطلب', en: 'Checkout' },
  'page.thankyou': { ar: 'شكراً لطلبك', en: 'Thank you' },
  'page.order': { ar: 'تفاصيل الطلب', en: 'Order details' },

  // Generic / WIP
  'wip.badge': { ar: 'قيد الإنشاء', en: 'In progress' },
  'wip.note': { ar: 'هذه الصفحة قيد الإنشاء وستكتمل قريباً.', en: 'This page is in progress and will be completed soon.' },
  'common.backHome': { ar: 'العودة للرئيسية', en: 'Back to home' },
  'notFound.title': { ar: 'الصفحة غير موجودة', en: 'Page not found' },
  'notFound.body': { ar: 'عذراً، لم نتمكن من العثور على الصفحة المطلوبة.', en: 'Sorry, we could not find the page you were looking for.' },
  'notFound.browse': { ar: 'تصفّح الأقسام', en: 'Browse categories' },

  'common.optional': { ar: 'اختياري', en: 'optional' },
  'common.loading': { ar: 'جاري التحميل…', en: 'Loading…' },
  'common.retry': { ar: 'إعادة المحاولة', en: 'Try again' },

  // Form fields (shared: checkout guest + auth)
  'field.firstName': { ar: 'الاسم الأول', en: 'First name' },
  'field.lastName': { ar: 'اسم العائلة', en: 'Last name' },
  'field.email': { ar: 'البريد الإلكتروني', en: 'Email' },
  'field.phone': { ar: 'رقم الجوال', en: 'Mobile number' },
  'field.password': { ar: 'كلمة المرور', en: 'Password' },
  'field.company': { ar: 'اسم المنشأة', en: 'Company name' },
  'field.required': { ar: 'هذا الحقل مطلوب', en: 'This field is required' },
  'field.emailInvalid': { ar: 'يرجى إدخال بريد إلكتروني صحيح', en: 'Enter a valid email address' },
  'field.phoneInvalid': { ar: 'يرجى إدخال رقم جوال صحيح', en: 'Enter a valid mobile number' },
  'field.passwordShort': { ar: 'كلمة المرور 6 أحرف على الأقل', en: 'Password must be at least 6 characters' },

  // Checkout
  'checkout.customerInfo': { ar: 'بيانات العميل', en: 'Customer details' },
  'checkout.loginPrompt': { ar: 'لديك حساب بالفعل؟', en: 'Already have an account?' },
  'checkout.welcome': { ar: 'مرحباً', en: 'Welcome' },
  'checkout.loggedInNote': { ar: 'سيُربط هذا الطلب بحسابك.', en: 'This order will be linked to your account.' },
  'checkout.guestNote': { ar: 'ننشئ لك حساباً تلقائياً لمتابعة طلبك وفاتورتك.', en: 'We create an account for you so you can track your order and invoice.' },
  'checkout.reviewFiles': { ar: 'مراجعة الطلب', en: 'Review your order' },
  'checkout.uploadAfterNote': { ar: 'سترفع ملفات التصميم بعد تقديم الطلب — من صفحة التأكيد أو صفحة الطلب.', en: 'You’ll upload your design files after placing the order — from the confirmation page or your order page.' },
  'checkout.rangeNote': { ar: 'الأسعار تقريبية — نراجع طلبك ثم نرسل لك السعر النهائي لاعتماده قبل إصدار الفاتورة.', en: 'Prices are estimates — we review your order, then send the final price for your approval before invoicing.' },
  'checkout.artworkFor': { ar: 'ملفات التصميم لـ', en: 'Artwork for' },
  'checkout.orderNote': { ar: 'ملاحظات على الطلب', en: 'Order notes' },
  'checkout.orderNotePlaceholder': { ar: 'أي تفاصيل إضافية تودّ إخبارنا بها (اختياري)', en: 'Anything else we should know (optional)' },
  'checkout.summary': { ar: 'ملخص الطلب', en: 'Order summary' },
  'checkout.submit': { ar: 'تأكيد الطلب', en: 'Place order' },
  'checkout.submitting': { ar: 'جاري إرسال الطلب…', en: 'Placing your order…' },
  'checkout.terms': {
    ar: 'بتأكيد الطلب فإنك توافق على شروط الخدمة وسياسة الخصوصية. الدفع يتم عبر تحويل بنكي بعد إصدار الفاتورة الضريبية.',
    en: 'By placing your order you agree to our terms and privacy policy. Payment is by bank transfer after your tax invoice is issued.',
  },
  'checkout.reassureTitle': { ar: 'الدفع والتأكيد', en: 'Payment & confirmation' },
  'checkout.reassureBody': {
    ar: 'بعد استلام طلبك نراجع ملفات التصميم، نتواصل معك عبر واتساب لتأكيد التفاصيل، ثم نُصدر فاتورة ضريبية يتم سدادها عبر تحويل بنكي.',
    en: 'After we receive your order we review the artwork, confirm details with you on WhatsApp, then issue a tax invoice paid by bank transfer.',
  },
  'checkout.error': { ar: 'تعذّر إتمام الطلب، يرجى المحاولة مرة أخرى.', en: "We couldn't complete your order. Please try again." },
  'checkout.emptyTitle': { ar: 'لا يوجد ما يُطلب', en: 'Nothing to check out' },
  'checkout.emptyBody': { ar: 'أضف منتجات إلى سلتك ثم عُد لإتمام الطلب.', en: 'Add products to your cart, then return to check out.' },

  // Auth
  'auth.loginSub': { ar: 'سجّل الدخول للوصول إلى طلباتك وفواتيرك.', en: 'Sign in to access your orders and invoices.' },
  'auth.signupSub': { ar: 'أنشئ حساباً لمتابعة طلباتك وفواتيرك بسهولة.', en: 'Create an account to easily track your orders and invoices.' },
  'auth.noAccount': { ar: 'ليس لديك حساب؟', en: "Don't have an account?" },
  'auth.haveAccount': { ar: 'لديك حساب بالفعل؟', en: 'Already have an account?' },
  'auth.loginError': { ar: 'تعذّر تسجيل الدخول. تأكد من البريد وكلمة المرور.', en: 'Sign-in failed. Check your email and password.' },
  'auth.signupError': { ar: 'تعذّر إنشاء الحساب. قد يكون البريد مستخدماً مسبقاً.', en: 'Could not create the account. The email may already be in use.' },
  'auth.submitLogin': { ar: 'دخول', en: 'Sign in' },
  'auth.submitSignup': { ar: 'إنشاء الحساب', en: 'Create account' },
  'auth.loading': { ar: 'جاري…', en: 'Please wait…' },

  // Account
  'account.subtitle': { ar: 'طلباتك وفواتيرك في مكان واحد.', en: 'Your orders and invoices in one place.' },
  'account.orders': { ar: 'طلباتي', en: 'My orders' },
  'account.empty.title': { ar: 'لا توجد طلبات بعد', en: 'No orders yet' },
  'account.empty.body': { ar: 'عند إتمام أول طلب ستجده هنا مع حالته وفاتورته.', en: 'Your first order will appear here with its status and invoice.' },
  'account.empty.cta': { ar: 'تصفّح المنتجات', en: 'Browse products' },
  'account.orderNum': { ar: 'طلب رقم', en: 'Order' },
  'account.itemsCount': { ar: 'عنصر', en: 'items' },
  'account.view': { ar: 'عرض التفاصيل', en: 'View details' },
  'account.loading': { ar: 'جاري تحميل طلباتك…', en: 'Loading your orders…' },
  'account.error': { ar: 'تعذّر تحميل الطلبات.', en: 'Could not load your orders.' },

  // Account area — shell + nav
  'account.title': { ar: 'حسابي', en: 'My account' },
  'account.hello': { ar: 'مرحباً', en: 'Hello' },
  'account.nav.overview': { ar: 'نظرة عامة', en: 'Overview' },
  'account.nav.orders': { ar: 'طلباتي', en: 'Orders' },
  'account.nav.invoices': { ar: 'الفواتير', en: 'Invoices' },
  'account.nav.estimates': { ar: 'عروض الأسعار', en: 'Estimates' },
  'account.nav.tickets': { ar: 'الدعم', en: 'Support' },
  'account.nav.profile': { ar: 'الملف الشخصي', en: 'Profile' },
  'account.nav.organization': { ar: 'المنشأة', en: 'Organization' },
  'account.nav.security': { ar: 'الأمان', en: 'Security' },
  'account.loadingGeneric': { ar: 'جاري التحميل…', en: 'Loading…' },
  'account.saved': { ar: 'تم الحفظ', en: 'Saved' },
  'account.save': { ar: 'حفظ', en: 'Save' },
  'account.saveError': { ar: 'تعذّر الحفظ. حاول مرة أخرى.', en: 'Could not save. Please try again.' },
  'account.retry': { ar: 'إعادة المحاولة', en: 'Retry' },
  'account.viewAll': { ar: 'عرض الكل', en: 'View all' },

  // Overview
  'account.overview.title': { ar: 'نظرة عامة', en: 'Overview' },
  'account.overview.statOrders': { ar: 'الطلبات', en: 'Orders' },
  'account.overview.statOpenInvoices': { ar: 'فواتير غير مسددة', en: 'Open invoices' },
  'account.overview.statDue': { ar: 'المبلغ المستحق', en: 'Amount due' },
  'account.overview.recentOrders': { ar: 'أحدث الطلبات', en: 'Recent orders' },
  'account.overview.noRecent': { ar: 'لا توجد طلبات بعد.', en: 'No orders yet.' },

  // Profile
  'account.profile.title': { ar: 'الملف الشخصي', en: 'Profile' },
  'account.profile.firstName': { ar: 'الاسم الأول', en: 'First name' },
  'account.profile.lastName': { ar: 'اسم العائلة', en: 'Last name' },
  'account.profile.email': { ar: 'البريد الإلكتروني', en: 'Email' },
  'account.profile.phone': { ar: 'رقم الجوال', en: 'Phone' },
  'account.profile.avatar': { ar: 'الصورة الشخصية', en: 'Profile photo' },
  'account.profile.changePhoto': { ar: 'تغيير الصورة', en: 'Change photo' },
  'account.profile.photoError': { ar: 'تعذّر رفع الصورة. حاول مرة أخرى.', en: 'Could not upload the photo. Please try again.' },
  'account.profile.photoType': { ar: 'يرجى اختيار صورة بصيغة JPG أو PNG (صيغة HEIC غير مدعومة — حوّلها أولاً).', en: 'Please use a JPG or PNG image (HEIC isn’t supported — convert it first).' },
  'account.profile.photoProcessing': { ar: 'جاري تجهيز الصورة…', en: 'Preparing image…' },

  // Organization
  'account.org.title': { ar: 'المنشأة', en: 'Organization' },
  'account.org.companyName': { ar: 'اسم المنشأة', en: 'Company name' },
  'account.org.vat': { ar: 'الرقم الضريبي', en: 'VAT number' },
  'account.org.website': { ar: 'الموقع الإلكتروني', en: 'Website' },
  'account.org.phone': { ar: 'هاتف المنشأة', en: 'Company phone' },
  'account.org.address': { ar: 'العنوان', en: 'Address' },
  'account.org.city': { ar: 'المدينة', en: 'City' },
  'account.org.state': { ar: 'المنطقة', en: 'Region' },
  'account.org.zip': { ar: 'الرمز البريدي', en: 'Postal code' },
  'account.org.country': { ar: 'الدولة', en: 'Country' },
  'account.org.team': { ar: 'أعضاء الحساب', en: 'Team members' },
  'account.org.primary': { ar: 'جهة الاتصال الرئيسية', en: 'Primary contact' },

  // Security
  'account.security.title': { ar: 'كلمة المرور والأمان', en: 'Password & security' },
  'account.security.current': { ar: 'كلمة المرور الحالية', en: 'Current password' },
  'account.security.new': { ar: 'كلمة المرور الجديدة', en: 'New password' },
  'account.security.confirm': { ar: 'تأكيد كلمة المرور', en: 'Confirm password' },
  'account.security.update': { ar: 'تحديث كلمة المرور', en: 'Update password' },
  'account.security.mismatch': { ar: 'كلمتا المرور غير متطابقتين.', en: 'Passwords do not match.' },
  'account.security.tooShort': { ar: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.', en: 'Password must be at least 8 characters.' },
  'account.security.wrongCurrent': { ar: 'كلمة المرور الحالية غير صحيحة.', en: 'Current password is incorrect.' },
  'account.security.changed': { ar: 'تم تحديث كلمة المرور.', en: 'Password updated.' },

  // Invoices
  'account.invoices.title': { ar: 'الفواتير', en: 'Invoices' },
  'account.invoices.empty': { ar: 'لا توجد فواتير بعد.', en: 'No invoices yet.' },
  'account.invoices.number': { ar: 'رقم الفاتورة', en: 'Invoice' },
  'account.invoices.date': { ar: 'التاريخ', en: 'Date' },
  'account.invoices.due': { ar: 'المستحق', en: 'Due' },
  'account.invoices.dueDate': { ar: 'تاريخ الاستحقاق', en: 'Due date' },
  'account.invoices.total': { ar: 'الإجمالي', en: 'Total' },
  'account.invoices.paid': { ar: 'المدفوع', en: 'Paid' },
  'account.invoices.subtotal': { ar: 'المجموع', en: 'Subtotal' },
  'account.invoices.tax': { ar: 'الضريبة', en: 'Tax' },
  'account.invoices.payNow': { ar: 'ادفع الآن', en: 'Pay now' },
  'account.invoices.print': { ar: 'طباعة', en: 'Print' },
  'account.invoices.download': { ar: 'تحميل الفاتورة', en: 'Download invoice' },
  'account.invoices.status.paid': { ar: 'مدفوعة', en: 'Paid' },
  'account.invoices.status.not_paid': { ar: 'غير مدفوعة', en: 'Not paid' },
  'account.invoices.status.partially_paid': { ar: 'مدفوعة جزئياً', en: 'Partially paid' },
  'account.invoices.status.draft': { ar: 'مسودة', en: 'Draft' },

  // Estimates
  'account.estimates.title': { ar: 'عروض الأسعار', en: 'Estimates' },
  'account.estimates.empty': { ar: 'لا توجد عروض أسعار.', en: 'No estimates yet.' },
  'account.estimates.number': { ar: 'رقم العرض', en: 'Estimate' },
  'account.estimates.validUntil': { ar: 'صالح حتى', en: 'Valid until' },
  'account.estimates.accept': { ar: 'قبول العرض', en: 'Accept' },
  'account.estimates.reject': { ar: 'رفض العرض', en: 'Decline' },
  'account.estimates.accepted': { ar: 'تم قبول العرض', en: 'Estimate accepted' },
  'account.estimates.declined': { ar: 'تم رفض العرض', en: 'Estimate declined' },
  'account.estimates.status.sent': { ar: 'بانتظار الرد', en: 'Awaiting response' },
  'account.estimates.status.accepted': { ar: 'مقبول', en: 'Accepted' },
  'account.estimates.status.declined': { ar: 'مرفوض', en: 'Declined' },
  'account.estimates.status.expired': { ar: 'منتهي', en: 'Expired' },

  // Tickets / support
  'account.tickets.title': { ar: 'الدعم الفني', en: 'Support' },
  'account.tickets.empty': { ar: 'لا توجد تذاكر دعم.', en: 'No support tickets yet.' },
  'account.tickets.new': { ar: 'تذكرة جديدة', en: 'New ticket' },
  'account.tickets.subject': { ar: 'الموضوع', en: 'Subject' },
  'account.tickets.message': { ar: 'رسالتك', en: 'Your message' },
  'account.tickets.send': { ar: 'إرسال', en: 'Send' },
  'account.tickets.reply': { ar: 'رد', en: 'Reply' },
  'account.tickets.close': { ar: 'إغلاق التذكرة', en: 'Close ticket' },
  'account.tickets.closed': { ar: 'مغلقة', en: 'Closed' },
  'account.tickets.you': { ar: 'أنت', en: 'You' },
  'account.tickets.support': { ar: 'فريق الدعم', en: 'Support team' },
  'account.tickets.messagesCount': { ar: 'رسائل', en: 'messages' },
  'account.tickets.status.new': { ar: 'جديدة', en: 'New' },
  'account.tickets.status.open': { ar: 'مفتوحة', en: 'Open' },
  'account.tickets.status.client_replied': { ar: 'بانتظار الرد', en: 'Awaiting reply' },
  'account.tickets.status.closed': { ar: 'مغلقة', en: 'Closed' },

  // Order detail
  'order.status': { ar: 'حالة الطلب', en: 'Order status' },
  'order.placedOn': { ar: 'تاريخ الطلب', en: 'Placed on' },
  'order.items': { ar: 'عناصر الطلب', en: 'Order items' },
  'order.item': { ar: 'المنتج', en: 'Item' },
  'order.qty': { ar: 'الكمية', en: 'Qty' },
  'order.unit': { ar: 'الوحدة', en: 'Unit' },
  'order.rate': { ar: 'السعر', en: 'Rate' },
  'order.lineTotal': { ar: 'الإجمالي', en: 'Total' },
  'order.priceApprovalTitle': { ar: 'السعر النهائي جاهز لاعتمادك', en: 'Your final price is ready' },
  'order.priceApprovalBody': { ar: 'راجعنا طلبك وهذا هو السعر النهائي. باعتماده نُصدر الفاتورة الضريبية ونبدأ التنفيذ فوراً.', en: 'We reviewed your order — this is the final price. Approve it and we issue the tax invoice and start production right away.' },
  'order.estimateWas': { ar: 'السعر التقديري', en: 'Estimated price' },
  'order.finalPrice': { ar: 'السعر النهائي', en: 'Final price' },
  'order.approve': { ar: 'اعتماد السعر والمتابعة', en: 'Approve & continue' },
  'order.decline': { ar: 'لا أوافق على السعر', en: 'Decline the price' },
  'order.approvedMsg': { ar: 'تم اعتماد السعر — بدأنا التنفيذ وستجد فاتورتك في حسابك.', en: 'Price approved — production has started and your invoice is in your account.' },
  'order.declinedMsg': { ar: 'سجّلنا اعتذارك عن السعر — سنتواصل معك قريباً.', en: 'Your response was recorded — we will contact you shortly.' },
  'order.respondError': { ar: 'تعذّر إرسال ردك. حاول مرة أخرى.', en: 'Could not send your response. Please try again.' },
  'order.pricePendingNote': { ar: 'جاري تسعير طلبك — سنرسل لك السعر النهائي لاعتماده قريباً.', en: 'Your order is being priced — we will send the final price for your approval soon.' },
  'order.matrixTitle': { ar: 'اختر مزوّد الطباعة', en: 'Choose your print supplier' },
  'order.matrixHint': { ar: 'قارن الأسعار ومدة التنفيذ واختر المزوّد المناسب لك. الخيار الأوفر مُوصى به.', en: 'Compare prices and lead times and pick the supplier that suits you. The cheapest option is recommended.' },
  'order.vendor': { ar: 'مزوّد', en: 'Supplier' },
  'order.recommended': { ar: 'موصى به', en: 'Recommended' },
  'order.leadTime': { ar: 'مدة التنفيذ', en: 'Lead time' },
  'order.days': { ar: 'يوم', en: 'days' },
  'order.deliversOffice': { ar: 'توصيل إلى المكتب', en: 'Delivers to office' },
  'order.declineConfirm': { ar: 'تأكيد الرفض', en: 'Confirm decline' },
  'order.declineReasonLabel': { ar: 'سبب رفض السعر (اختياري)', en: 'Why are you declining? (optional)' },
  'order.declineReasonPlaceholder': { ar: 'مثال: السعر مرتفع، تغيّرت احتياجاتي…', en: 'e.g. too expensive, my needs changed…' },
  'order.files': { ar: 'ملفات التصميم', en: 'Design files' },
  'order.filesPerItemHint': { ar: 'ارفع ملف التصميم لكل عنصر على حدة حتى يعرف فريق الطباعة أي ملف يخص أي منتج.', en: 'Upload a design file for each item separately so the print team knows which file belongs to which product.' },
  'order.generalFiles': { ar: 'ملفات عامة (غير مرتبطة بعنصر)', en: 'General files (not linked to an item)' },
  'order.noFiles': { ar: 'لا توجد ملفات مرفقة بهذا الطلب.', en: 'No files are attached to this order.' },
  'order.uploadItemHint': { ar: 'ارفع ملف تصميم هذا العنصر', en: 'Upload the design for this item' },
  'order.uploadBtn': { ar: 'رفع ملف', en: 'Upload file' },
  'order.uploading': { ar: 'جاري الرفع…', en: 'Uploading…' },
  'order.uploadError': { ar: 'تعذّر رفع الملف. تأكد من الصيغة والحجم.', en: 'Could not upload the file. Check the format and size.' },
  'order.note': { ar: 'ملاحظات الطلب', en: 'Order notes' },
  'order.invoice': { ar: 'الفاتورة', en: 'Invoice' },
  'order.invoiceTotal': { ar: 'إجمالي الفاتورة', en: 'Invoice total' },
  'order.invoiceDue': { ar: 'المبلغ المتبقّي', en: 'Amount due' },
  'order.invoiceStatus': { ar: 'حالة الفاتورة', en: 'Invoice status' },
  'order.pay': { ar: 'ادفع الآن', en: 'Pay now' },
  'order.loading': { ar: 'جاري تحميل الطلب…', en: 'Loading order…' },
  'order.notFound': { ar: 'تعذّر العثور على الطلب المطلوب.', en: 'We could not find that order.' },
  'order.backToOrders': { ar: 'العودة إلى طلباتي', en: 'Back to my orders' },
  'order.subtotal': { ar: 'إجمالي الطلب', en: 'Order total' },

  // Bank transfer / WhatsApp (shared)
  'bank.title': { ar: 'الدفع عبر التحويل البنكي', en: 'Pay by bank transfer' },
  'bank.bank': { ar: 'البنك', en: 'Bank' },
  'bank.accountName': { ar: 'اسم الحساب', en: 'Account name' },
  'bank.iban': { ar: 'رقم الآيبان', en: 'IBAN' },
  'bank.note': { ar: 'أرسل إيصال التحويل عبر واتساب لتأكيد الدفع وبدء التنفيذ.', en: 'Send the transfer receipt on WhatsApp to confirm payment and start production.' },
  'bank.copy': { ar: 'نسخ', en: 'Copy' },
  'bank.copied': { ar: 'تم النسخ', en: 'Copied' },
  'whatsapp.cta': { ar: 'تواصل عبر واتساب', en: 'Chat on WhatsApp' },

  // Thank-you
  'thanks.title': { ar: 'شكراً لطلبك!', en: 'Thank you for your order!' },
  'thanks.sub': { ar: 'استلمنا طلبك بنجاح وسنبدأ العمل عليه فوراً.', en: "We've received your order and will start on it right away." },
  'thanks.orderNum': { ar: 'رقم طلبك', en: 'Your order number' },
  'thanks.uploadTitle': { ar: 'ارفع ملفات التصميم', en: 'Upload your design files' },
  'thanks.uploadHint': { ar: 'ارفع ملف التصميم لكل عنصر طلبته حتى نبدأ الطباعة. يمكنك أيضاً رفعها لاحقاً من صفحة الطلب.', en: 'Upload a design file for each item you ordered so we can start printing. You can also upload them later from your order page.' },
  'thanks.next': { ar: 'ماذا بعد؟', en: "What's next?" },
  'thanks.next1.title': { ar: 'مراجعة التصميم', en: 'Design review' },
  'thanks.next1.body': { ar: 'يراجع فريقنا ملفات تصميمك ويجهّزها للطباعة.', en: 'Our team reviews your artwork and prepares it for print.' },
  'thanks.next2.title': { ar: 'تأكيد السعر النهائي', en: 'Final price confirmation' },
  'thanks.next2.body': { ar: 'نراجع طلبك ونرسل لك السعر النهائي لاعتماده، ثم نُصدر الفاتورة الضريبية.', en: 'We review your order and send the final price for your approval, then issue the tax invoice.' },
  'thanks.next3.title': { ar: 'الفاتورة في حسابك', en: 'Invoice in your account' },
  'thanks.next3.body': { ar: 'تجد فاتورتك وحالة طلبك في صفحة حسابك في أي وقت.', en: 'Find your invoice and order status in your account anytime.' },
  'thanks.viewAccount': { ar: 'عرض طلباتي', en: 'View my orders' },
  'thanks.continue': { ar: 'مواصلة التسوّق', en: 'Continue shopping' },
  'thanks.noOrder': { ar: 'لم نعثر على طلب حديث لعرضه.', en: "We couldn't find a recent order to show." },

  // Policies (shared chrome)
  'policy.updated': { ar: 'آخر تحديث: يوليو 2026', en: 'Last updated: July 2026' },

  // Status labels (print statuses) — used by StatusTimeline / order pages
  'status.new': { ar: 'طلب جديد', en: 'New' },
  'status.review': { ar: 'مراجعة التصميم', en: 'Design review' },
  'status.approved': { ar: 'معتمد', en: 'Approved' },
  'status.printing': { ar: 'قيد الطباعة', en: 'Printing' },
  'status.ready': { ar: 'جاهز للاستلام', en: 'Ready' },
  'status.shipped': { ar: 'تم الشحن', en: 'Shipped' },
  'status.delivered': { ar: 'تم التسليم', en: 'Delivered' },
} as const satisfies Record<string, Pair>;

export type StringKey = keyof typeof STRINGS;

/** Translate a chrome key for the given locale. */
export function t(key: StringKey, locale: Locale = 'ar'): string {
  const entry = STRINGS[key];
  return entry ? entry[locale] : String(key);
}

/** Ordered print-status keys for StatusTimeline. */
export const STATUS_ORDER: StringKey[] = [
  'status.new',
  'status.review',
  'status.approved',
  'status.printing',
  'status.ready',
  'status.shipped',
  'status.delivered',
];

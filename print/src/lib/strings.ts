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
  'product.added': { ar: 'تمت الإضافة ✓', en: 'Added ✓' },
  'product.quantity': { ar: 'الكمية', en: 'Quantity' },
  'product.artworkNote': { ar: 'ارفع ملف التصميم عند إتمام الطلب.', en: 'Upload your artwork at checkout.' },
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
  'checkout.reviewFiles': { ar: 'مراجعة الطلب وملفات التصميم', en: 'Review order & artwork' },
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

  // Order detail
  'order.status': { ar: 'حالة الطلب', en: 'Order status' },
  'order.placedOn': { ar: 'تاريخ الطلب', en: 'Placed on' },
  'order.items': { ar: 'عناصر الطلب', en: 'Order items' },
  'order.item': { ar: 'المنتج', en: 'Item' },
  'order.qty': { ar: 'الكمية', en: 'Qty' },
  'order.unit': { ar: 'الوحدة', en: 'Unit' },
  'order.rate': { ar: 'السعر', en: 'Rate' },
  'order.lineTotal': { ar: 'الإجمالي', en: 'Total' },
  'order.files': { ar: 'الملفات المرفقة', en: 'Attached files' },
  'order.noFiles': { ar: 'لا توجد ملفات مرفقة بهذا الطلب.', en: 'No files are attached to this order.' },
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
  'bank.copied': { ar: 'تم النسخ ✓', en: 'Copied ✓' },
  'whatsapp.cta': { ar: 'تواصل عبر واتساب', en: 'Chat on WhatsApp' },

  // Thank-you
  'thanks.title': { ar: 'شكراً لطلبك!', en: 'Thank you for your order!' },
  'thanks.sub': { ar: 'استلمنا طلبك بنجاح وسنبدأ العمل عليه فوراً.', en: "We've received your order and will start on it right away." },
  'thanks.orderNum': { ar: 'رقم طلبك', en: 'Your order number' },
  'thanks.next': { ar: 'ماذا بعد؟', en: "What's next?" },
  'thanks.next1.title': { ar: 'مراجعة التصميم', en: 'Design review' },
  'thanks.next1.body': { ar: 'يراجع فريقنا ملفات تصميمك ويجهّزها للطباعة.', en: 'Our team reviews your artwork and prepares it for print.' },
  'thanks.next2.title': { ar: 'تأكيد عبر واتساب', en: 'WhatsApp confirmation' },
  'thanks.next2.body': { ar: 'نتواصل معك لتأكيد التفاصيل وإصدار الفاتورة الضريبية.', en: "We'll reach out to confirm details and issue your tax invoice." },
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

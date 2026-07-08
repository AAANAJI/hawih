/**
 * config.ts — central runtime configuration for the print store.
 * Imported by both build-time (.astro) and client-side (browser) code.
 */

export const API_BASE = 'https://crm.hawih.com.sa/index.php/print_api/';

export const GTM_ID = 'GTM-N3BWDWG';

export const SITE_URL = 'https://print.hawih.com.sa';

export const CURRENCY = 'SAR';

/** WhatsApp business number (E.164, no +) for wa.me links. */
export const WHATSAPP = '966502185471';

/** Prefilled Arabic WhatsApp message for order enquiries. */
export const WHATSAPP_MSG_AR =
  'مرحباً هوية، لدي استفسار بخصوص طلب طباعة.';
export const WHATSAPP_MSG_EN =
  'Hello Hawih, I have an enquiry about a print order.';

export function whatsappUrl(message?: string): string {
  const msg = message ?? WHATSAPP_MSG_AR;
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
}

/** Bank-transfer details shown at checkout (manual-first payments). */
export const BANK_TRANSFER = {
  bank_name_ar: 'مصرف الراجحي',
  bank_name_en: 'Al Rajhi Bank',
  account_name: 'Hawih Business / مؤسسة هوية',
  iban: 'SA00 0000 0000 0000 0000 0000', // placeholder — replace with live IBAN
};

/** localStorage / sessionStorage keys — single source of truth. */
export const STORAGE_KEYS = {
  cart: 'hawih_print_cart',
  token: 'hawih_print_token',
  tokenExpiry: 'hawih_print_token_expiry',
  lastOrder: 'hawih_print_last_order',
} as const;

/** Link back to the main brand site, with UTM attribution. */
export const HAWIH_MAIN_URL =
  'https://hawih.com.sa/?utm_source=print&utm_medium=store&utm_campaign=hawih_strip';

/** Organization @id on the main site (structured-data linkage). */
export const HAWIH_ORG_ID = 'https://hawih.com.sa/#organization';

/** Artwork upload constraints — mirror the server. */
export const UPLOAD = {
  maxBytes: 25 * 1024 * 1024, // 25MB
  accept: ['jpg', 'jpeg', 'png', 'pdf', 'zip', 'ai', 'eps'],
};

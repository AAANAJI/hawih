/**
 * checkout.ts — builds the multipart checkout request and posts it.
 * BROWSER-side. Used by the checkout page (the second agent fleshes out
 * the UI; this module is the reusable submit logic).
 *
 * The checkout endpoint accepts Bearer (logged-in) OR guest fields.
 * On success it stores {order_id,total,order_display} in sessionStorage,
 * saves a returned token if present, and (caller) redirects to thank-you.
 */
import { api, setToken } from './api';
import { getCart, clearCart, subtotal, type CartLine } from './cart';
import { STORAGE_KEYS } from './config';

export interface GuestFields {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  company_name?: string;
}

export interface CheckoutInput {
  /** Order-level note. */
  orderNote?: string;
  /** Guest fields — omit when the user is logged in. */
  guest?: GuestFields;
  /** Artwork files to attach as manualFiles[]. */
  files?: File[];
  /**
   * Per-line artwork file-name mapping. cart[].artwork_file_names references
   * files uploaded via manualFiles[] by name. If omitted, all files are
   * treated as order-level attachments.
   */
  artworkNamesByLine?: Record<number, string[]>;
}

export interface CheckoutResult {
  success: boolean;
  order_id?: string | number;
  order_display?: string;
  total?: number;
  token?: string;
  invoice_id?: string | number;
  message?: string;
}

/** Serialize the cart into the API's expected `cart` JSON string. */
export function buildCartJson(
  lines: CartLine[],
  artworkNamesByLine: Record<number, string[]> = {},
): string {
  const payload = lines.map((l, idx) => ({
    item_id: l.item_id,
    quantity: l.qty,
    options: l.options,
    note: l.note ?? '',
    // Each line carries the temp names of the design files uploaded for it on
    // the product page; the server links those files to this exact order_item.
    // An explicit override (artworkNamesByLine) still wins when provided.
    artwork_file_names: artworkNamesByLine[idx] ?? (l.artwork ?? []).map((a) => a.file_name),
  }));
  return JSON.stringify(payload);
}

/** Build the multipart FormData body for /checkout. */
export function buildCheckoutForm(input: CheckoutInput): FormData {
  const lines = getCart();
  const fd = new FormData();
  fd.append('cart', buildCartJson(lines, input.artworkNamesByLine));
  fd.append('order_note', input.orderNote ?? '');

  if (input.guest) {
    fd.append('first_name', input.guest.first_name);
    fd.append('last_name', input.guest.last_name);
    fd.append('email', input.guest.email);
    fd.append('phone', input.guest.phone);
    fd.append('password', input.guest.password);
    if (input.guest.company_name) fd.append('company_name', input.guest.company_name);
  }

  // Artwork uploaded on the product page: reference the already-stored temp
  // files by name/size. The server's move_files_from_temp_dir_to_permanent_dir
  // consumes file_names[]/file_sizes[] and attaches them to the order.
  for (const line of lines) {
    for (const art of line.artwork ?? []) {
      fd.append('file_names[]', art.file_name);
      fd.append('file_sizes[]', String(art.file_size));
    }
  }

  // Any files uploaded directly at checkout (fallback dropzone).
  for (const file of input.files ?? []) {
    fd.append('manualFiles[]', file, file.name);
  }
  return fd;
}

/**
 * Submit checkout. On success persists the order to sessionStorage and,
 * for guest checkout, saves any returned token. Returns the result — the
 * caller performs the redirect to the locale thank-you page.
 */
export async function submitCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const fd = buildCheckoutForm(input);
  const res = (await api.checkout(fd)) as unknown as CheckoutResult;

  if (res.success) {
    if (res.token) setToken(res.token);
    sessionStorage.setItem(
      STORAGE_KEYS.lastOrder,
      JSON.stringify({
        order_id: res.order_id,
        order_display: res.order_display,
        total: res.total ?? subtotal(),
        invoice_id: res.invoice_id,
      }),
    );
    clearCart();
  }
  return res;
}

/** Read the last completed order (for the thank-you page). */
export function getLastOrder(): {
  order_id?: string | number;
  order_display?: string;
  total?: number;
  invoice_id?: string | number;
} | null {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem(STORAGE_KEYS.lastOrder);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

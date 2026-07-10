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
  /** Design files attached at checkout (order-level, uploaded with the order). */
  files?: File[];
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
export function buildCartJson(lines: CartLine[]): string {
  const payload = lines.map((l) => ({
    item_id: l.item_id,
    quantity: l.qty,
    options: l.options,
    note: l.note ?? '',
  }));
  return JSON.stringify(payload);
}

/** Build the multipart FormData body for /checkout. */
export function buildCheckoutForm(input: CheckoutInput): FormData {
  const lines = getCart();
  const fd = new FormData();
  fd.append('cart', buildCartJson(lines));
  fd.append('order_note', input.orderNote ?? '');

  if (input.guest) {
    fd.append('first_name', input.guest.first_name);
    fd.append('last_name', input.guest.last_name);
    fd.append('email', input.guest.email);
    fd.append('phone', input.guest.phone);
    fd.append('password', input.guest.password);
    if (input.guest.company_name) fd.append('company_name', input.guest.company_name);
  }

  // Design files attached at checkout → uploaded with the order (order-level).
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

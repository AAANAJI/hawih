/**
 * cart.ts — client-side cart backed by localStorage.
 * Runs in the BROWSER only. Import in <script> tags on pages.
 *
 * Storage key: STORAGE_KEYS.cart ('hawih_print_cart')
 * Shape: CartLine[]
 * Emits a 'cart:change' CustomEvent on window whenever the cart mutates,
 * so the header badge and cart page can react.
 */
import { STORAGE_KEYS } from './config';

export interface CartLine {
  item_id: string;
  slug: string;
  title: string;
  qty: number;
  rate: number; // effective per-order rate (base + option deltas)
  options: Record<string, string>; // { optionName: value }
  note?: string;
  image?: string;
}

const KEY = STORAGE_KEYS.cart;

function safeParse(json: string | null): CartLine[] {
  if (!json) return [];
  try {
    const val = JSON.parse(json);
    return Array.isArray(val) ? (val as CartLine[]) : [];
  } catch {
    return [];
  }
}

/** Read the full cart. */
export function getCart(): CartLine[] {
  if (typeof localStorage === 'undefined') return [];
  return safeParse(localStorage.getItem(KEY));
}

function persist(lines: CartLine[]): void {
  localStorage.setItem(KEY, JSON.stringify(lines));
  emitChange(lines);
}

function emitChange(lines: CartLine[]): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('cart:change', {
      detail: { count: countItems(lines), subtotal: subtotal(lines), lines },
    }),
  );
}

/** Two lines are the same product IF slug + options match (note ignored). */
function sameLine(a: CartLine, b: Pick<CartLine, 'slug' | 'options'>): boolean {
  if (a.slug !== b.slug) return false;
  const ak = Object.keys(a.options);
  const bk = Object.keys(b.options);
  if (ak.length !== bk.length) return false;
  return ak.every((k) => a.options[k] === b.options[k]);
}

/** Add a line (merges qty if an identical slug+options line exists). */
export function addToCart(line: CartLine): CartLine[] {
  const lines = getCart();
  const existing = lines.find((l) => sameLine(l, line));
  if (existing) {
    existing.qty += line.qty;
    existing.rate = line.rate;
    if (line.note) existing.note = line.note;
  } else {
    lines.push({ ...line, qty: Math.max(1, line.qty) });
  }
  persist(lines);
  return lines;
}

/** Update quantity of the line at index. Removes it if qty <= 0. */
export function updateQty(index: number, qty: number): CartLine[] {
  const lines = getCart();
  if (!lines[index]) return lines;
  if (qty <= 0) {
    lines.splice(index, 1);
  } else {
    lines[index].qty = qty;
  }
  persist(lines);
  return lines;
}

/** Update the free-text note of the line at index. */
export function updateNote(index: number, note: string): CartLine[] {
  const lines = getCart();
  if (lines[index]) {
    lines[index].note = note;
    persist(lines);
  }
  return lines;
}

/** Remove the line at index. */
export function removeLine(index: number): CartLine[] {
  const lines = getCart();
  lines.splice(index, 1);
  persist(lines);
  return lines;
}

/** Empty the cart. */
export function clearCart(): void {
  localStorage.removeItem(KEY);
  emitChange([]);
}

/** Total number of distinct-quantity items (sum of qty). */
export function countItems(lines: CartLine[] = getCart()): number {
  return lines.reduce((sum, l) => sum + l.qty, 0);
}

/** Cart subtotal = sum(rate * qty). VAT is added at invoicing. */
export function subtotal(lines: CartLine[] = getCart()): number {
  return lines.reduce((sum, l) => sum + l.rate * l.qty, 0);
}

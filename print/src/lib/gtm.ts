/**
 * gtm.ts — dataLayer helpers for GTM (GTM-N3BWDWG).
 * The container is loaded unconditionally in Base.astro. These helpers
 * push GA4 e-commerce events. BROWSER-side.
 */

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/** Low-level push. Safe if dataLayer isn't ready yet (creates it). */
export function pushDataLayer(event: string, payload: Record<string, unknown> = {}): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...payload });
}

interface ItemPayload {
  item_id: string;
  item_name: string;
  price?: number;
  item_category?: string;
  quantity?: number;
}

export function viewItemList(list_name: string, items: ItemPayload[]): void {
  pushDataLayer('view_item_list', {
    ecommerce: { item_list_name: list_name, items },
  });
}

export function viewItem(item: ItemPayload): void {
  pushDataLayer('view_item', { ecommerce: { currency: 'SAR', value: item.price, items: [item] } });
}

export function addToCartEvent(item: ItemPayload): void {
  pushDataLayer('add_to_cart', {
    ecommerce: { currency: 'SAR', value: (item.price ?? 0) * (item.quantity ?? 1), items: [item] },
  });
}

export function beginCheckout(items: ItemPayload[], value: number): void {
  pushDataLayer('begin_checkout', { ecommerce: { currency: 'SAR', value, items } });
}

export function purchase(transaction_id: string, value: number, items: ItemPayload[]): void {
  pushDataLayer('purchase', {
    ecommerce: { transaction_id, currency: 'SAR', value, items },
  });
}

export function signUpEvent(method = 'store'): void {
  pushDataLayer('sign_up', { method });
}

export function loginEvent(method = 'store'): void {
  pushDataLayer('login', { method });
}

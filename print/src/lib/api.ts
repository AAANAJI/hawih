/**
 * api.ts — typed fetch wrapper around the print API.
 * BROWSER-side. Attaches the Bearer token from localStorage on protected
 * calls. On 401 it clears the token and redirects to the locale login page.
 *
 * Endpoints (see API CONTRACT): health, catalog, order_statuses, signup,
 * login, logout, me, checkout, orders, orders/{id}.
 */
import { API_BASE, STORAGE_KEYS } from './config';
import type { Locale } from './format';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  [key: string]: unknown;
}

export function getToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEYS.token);
}

export function setToken(token: string, expiresAt?: string): void {
  localStorage.setItem(STORAGE_KEYS.token, token);
  if (expiresAt) localStorage.setItem(STORAGE_KEYS.tokenExpiry, expiresAt);
}

export function clearToken(): void {
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.tokenExpiry);
}

export function isAuthed(): boolean {
  return !!getToken();
}

/** Detect the current locale from the URL path (/en/ prefix -> en). */
export function currentLocale(): Locale {
  if (typeof location === 'undefined') return 'ar';
  return location.pathname.startsWith('/en') ? 'en' : 'ar';
}

function loginPath(locale: Locale): string {
  return locale === 'en' ? '/en/auth/login/' : '/auth/login/';
}

interface RequestOptions {
  method?: string;
  /** JSON body — serialized automatically. Mutually exclusive with formData. */
  body?: unknown;
  /** Multipart body — sent as-is (do not set Content-Type). */
  formData?: FormData;
  /** Attach Bearer token if present. */
  auth?: boolean;
  /** Require a token; redirect to login if missing. */
  requireAuth?: boolean;
}

/**
 * Core request. Returns parsed JSON typed as ApiResponse<T> & T.
 * Throws on network failure; returns the parsed error body on non-2xx
 * (except 401, which triggers a redirect).
 */
export async function request<T = Record<string, unknown>>(
  endpoint: string,
  opts: RequestOptions = {},
): Promise<ApiResponse & T> {
  const { method = 'GET', body, formData, auth = false, requireAuth = false } = opts;
  const locale = currentLocale();
  const headers: Record<string, string> = {};
  const token = getToken();

  if ((auth || requireAuth) && token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (requireAuth && !token) {
    location.href = loginPath(locale);
    // Return a rejected-ish shape so callers can bail.
    return { success: false, message: 'unauthorized' } as ApiResponse & T;
  }

  let payload: BodyInit | undefined;
  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(API_BASE + endpoint, { method, headers, body: payload });

  if (res.status === 401) {
    clearToken();
    location.href = loginPath(locale);
    return { success: false, message: 'unauthorized' } as ApiResponse & T;
  }

  let data: ApiResponse & T;
  try {
    data = (await res.json()) as ApiResponse & T;
  } catch {
    data = { success: false, message: `HTTP ${res.status}` } as ApiResponse & T;
  }
  return data;
}

// ---- Typed convenience wrappers ----

export const api = {
  health: () => request('health'),
  catalog: () => request('catalog'),
  orderStatuses: () => request('order_statuses'),

  /** Upload one artwork file to the CRM temp store; returns {file_name,file_size,orig_name}. */
  uploadArtwork: (file: File) => {
    const fd = new FormData();
    fd.append('file', file, file.name);
    return request('upload', { method: 'POST', formData: fd, auth: true });
  },

  signup: (payload: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    password: string;
    company_name?: string;
  }) => request('signup', { method: 'POST', body: payload }),

  login: (payload: { email: string; password: string }) =>
    request('login', { method: 'POST', body: payload }),

  logout: () => request('logout', { method: 'POST', auth: true }),

  me: () => request('me', { requireAuth: true }),

  checkout: (formData: FormData) =>
    request('checkout', { method: 'POST', formData, auth: true }),

  orders: () => request('orders', { requireAuth: true }),

  order: (id: string | number) => request(`orders/${id}`, { requireAuth: true }),

  // ---- Self-service account ----
  account: () => request('account', { requireAuth: true }),

  updateProfile: (p: { first_name: string; last_name: string; phone: string; email?: string }) =>
    request('profile_update', { method: 'POST', body: p, auth: true }),

  changePassword: (p: { current_password: string; new_password: string }) =>
    request('password_change', { method: 'POST', body: p, auth: true }),

  /** Upload a new avatar (multipart); returns {avatar_url}. */
  uploadAvatar: (file: File) => {
    const fd = new FormData();
    fd.append('avatar', file, file.name);
    return request('avatar_upload', { method: 'POST', formData: fd, auth: true });
  },

  updateOrganization: (p: {
    company_name: string; address?: string; city?: string; state?: string;
    zip?: string; country?: string; phone?: string; website?: string; vat_number?: string;
  }) => request('organization_update', { method: 'POST', body: p, auth: true }),

  invoices: () => request('invoices', { requireAuth: true }),
  invoice: (id: string | number) => request(`invoices/${id}`, { requireAuth: true }),

  estimates: () => request('estimates', { requireAuth: true }),
  estimate: (id: string | number) => request(`estimates/${id}`, { requireAuth: true }),
  respondEstimate: (p: { id: number; action: 'accept' | 'reject' }) =>
    request('estimate_respond', { method: 'POST', body: p, auth: true }),

  tickets: () => request('tickets', { requireAuth: true }),
  ticket: (id: string | number) => request(`tickets/${id}`, { requireAuth: true }),
  createTicket: (p: { title: string; message: string }) =>
    request('ticket_create', { method: 'POST', body: p, auth: true }),
  replyTicket: (p: { id: number; message: string }) =>
    request('ticket_reply', { method: 'POST', body: p, auth: true }),
  closeTicket: (p: { id: number }) =>
    request('ticket_close', { method: 'POST', body: p, auth: true }),
};

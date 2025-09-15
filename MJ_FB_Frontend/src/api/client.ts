import { fetchWithRetry } from './fetchWithRetry';
import getApiErrorMessage from '../utils/getApiErrorMessage';

let API_BASE =
  (typeof process !== 'undefined' ? process.env?.VITE_API_BASE : undefined) ??
  (globalThis as any).VITE_API_BASE;

if (!API_BASE) {
  const message =
    'VITE_API_BASE is not defined. Set it in the frontend .env file (e.g. VITE_API_BASE=http://localhost:4000/api/v1)';
  console.error(message);
  throw new Error(message);
}

API_BASE = API_BASE.replace(/\/$/, '');
if (!API_BASE.endsWith('/api/v1')) {
  if (API_BASE.endsWith('/api')) API_BASE += '/v1';
  else API_BASE += '/api/v1';
}

let csrfToken: string | null = null;

async function ensureCsrfToken() {
  if (csrfToken) return;
  try {
    const res = await fetch(`${API_BASE}/auth/csrf-token`, { credentials: 'include' });
    const data = await res.json().catch(() => null);
    if (data && typeof data.csrfToken === 'string') {
      csrfToken = data.csrfToken;
    }
  } catch {
    /* ignore token fetch errors */
  }
}

// shared refresh promise to avoid multiple concurrent refresh calls
let refreshPromise: Promise<Response> | null = null;

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  if (!csrfToken) {
    await ensureCsrfToken();
  }
  if (csrfToken) headers.set('X-CSRF-Token', csrfToken);
  init.headers = headers;

  const request = new Request(input, { credentials: 'include', ...init });
  const retryRequest = request.clone();
  const urlString = request.url;
  const isRefreshCall = urlString.includes('/auth/refresh');

  let res: Response;
  try {
    res = await fetchWithRetry(request, {}, 1, 300);
  } catch (e) {
    // network failure; propagate without clearing auth
    throw e;
  }

  if (res.status === 403) {
    const data = await res
      .clone()
      .json()
      .catch(() => null);
    if (data && data.message === 'Invalid CSRF token') {
      csrfToken = null;
      await ensureCsrfToken();
      if (csrfToken) {
        const retryHeaders = new Headers(retryRequest.headers);
        retryHeaders.set('X-CSRF-Token', csrfToken);
        const retry = new Request(retryRequest, { headers: retryHeaders });
        res = await fetchWithRetry(retry, {}, 1, 300);
      }
    }
  }

  if (res.status === 401) {
    if (isRefreshCall) {
      clearAuthAndRedirect();
      return res;
    }
    try {
      if (!refreshPromise) {
        refreshPromise = fetchWithRetry(
          `${API_BASE}/auth/refresh`,
          { method: 'POST', credentials: 'include' },
          1,
          300,
        );
      }
      const refreshRes = await refreshPromise;
      refreshPromise = null;
      if ([200, 204, 409].includes(refreshRes.status)) {
        // 409 indicates another request already refreshed the tokens
        res = await fetchWithRetry(retryRequest, {}, 1, 300);
      } else {
        clearAuthAndRedirect();
      }
    } catch {
      refreshPromise = null;
      clearAuthAndRedirect();
    }
  }
  return res;
}

export function __resetCsrfTokenForTests() {
  csrfToken = null;
}

export interface ApiErrorDetails {
  errors?: { message: string }[];
  [key: string]: unknown;
}

export interface ApiError extends Error {
  details?: ApiErrorDetails;
  status?: number;
}

function getMessage(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value) return value;
  if (value instanceof Error && value.message) return value.message;
  if (
    value &&
    typeof value === 'object' &&
    'message' in value &&
    typeof (value as { message?: unknown }).message === 'string'
  ) {
    return (value as { message: string }).message;
  }
  return fallback;
}

function toDetails(value: unknown, fallback: string): ApiErrorDetails {
  if (value && typeof value === 'object') {
    const obj: ApiErrorDetails = { ...(value as Record<string, unknown>) };
    const rawErrors = (value as { errors?: unknown }).errors;
    obj.errors = Array.isArray(rawErrors)
      ? rawErrors.map(e => ({ message: getMessage(e, fallback) }))
      : [{ message: getMessage(value, fallback) }];
    return obj;
  }
  return { errors: [{ message: getMessage(value, fallback) }] };
}

export async function handleResponse<T = any>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = res.statusText;
    let data: unknown = null;
    const contentType = res.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      try {
        data = await res.json();
        const errData = data as Record<string, unknown>;
        message =
          (typeof errData.message === 'string' && errData.message) ||
          (typeof errData.error === 'string' && errData.error) ||
          JSON.stringify(errData);
      } catch (e) {
        const err: ApiError = new Error('Failed to parse error response JSON');
        err.status = res.status;
        err.details = toDetails(e, 'Failed to parse error response JSON');
        throw err;
      }
    } else {
      message = await res.text();
    }
    const err: ApiError = new Error(message);
    err.details = toDetails(data, message);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204 || res.headers.get('Content-Length') === '0') {
    return undefined as T;
  }
  const contentType = res.headers.get('Content-Type') || '';
  if (contentType.includes('application/json')) {
    try {
      return (await res.json()) as T;
    } catch (e) {
      const err: ApiError = new Error('Failed to parse response JSON');
      err.status = res.status;
      err.details = toDetails(e, 'Failed to parse response JSON');
      throw err;
    }
  }
  return (await res.text()) as any;
}

export { API_BASE, getApiErrorMessage };

function clearAuthAndRedirect() {
  localStorage.removeItem('role');
  localStorage.removeItem('name');
  localStorage.removeItem('userRole');
  localStorage.removeItem('access');
  localStorage.removeItem('id');
  const path = window.location.pathname;
  if (!path.startsWith('/login') && !path.startsWith('/set-password')) {
    window.location.assign('/login');
  }
}

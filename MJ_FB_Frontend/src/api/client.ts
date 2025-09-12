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

function getCsrfToken() {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('csrfToken='))?.split('=')[1];
}

// shared refresh promise to avoid multiple concurrent refresh calls
let refreshPromise: Promise<Response> | null = null;

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  let csrf = getCsrfToken();
  if (!csrf) {
    try {
      await fetch(`${API_BASE}/auth/csrf-token`, { credentials: 'include' });
      csrf = getCsrfToken();
    } catch {
      /* ignore token fetch errors */
    }
  }
  if (csrf) headers.set('X-CSRF-Token', csrf);
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

export interface ApiError extends Error {
  details?: unknown;
  status?: number;
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
        err.details = e;
        throw err;
      }
    } else {
      message = await res.text();
    }
    const err: ApiError = new Error(message);
    if (data) err.details = data;
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
      err.details = e;
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

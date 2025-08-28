const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

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

  const urlString =
    typeof input === 'string'
      ? input
      : input instanceof URL
      ? input.toString()
      : (input as Request).url;
  const isRefreshCall = urlString.includes('/auth/refresh');
  const fetchWithRetry = async (
    resource: RequestInfo | URL,
    options: RequestInit,
    retries = 1,
    backoff = 300,
  ): Promise<Response> => {
    for (let i = 0; i <= retries; i++) {
      try {
        return await fetch(resource, options);
      } catch (e) {
        if (i === retries) throw e;
        await new Promise(res => setTimeout(res, backoff * 2 ** i));
      }
    }
    throw new Error('Unreachable');
  };

  let res: Response;
  try {
    res = await fetchWithRetry(input, { credentials: 'include', ...init }, 1);
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
          2,
        );
      }
      const refreshRes = await refreshPromise;
      refreshPromise = null;
      if (refreshRes.ok) {
        res = await fetchWithRetry(input, { credentials: 'include', ...init }, 1);
      } else if (refreshRes.status === 401) {
        clearAuthAndRedirect();
      }
    } catch {
      // network error during refresh; propagate original 401 without clearing auth
      refreshPromise = null;
    }
  }
  return res;
}

export async function handleResponse(res: Response) {
  if (!res.ok) {
    let message = res.statusText;
    let data: any = null;
    try {
      data = await res.json();
      message = data.message || data.error || JSON.stringify(data);
    } catch {
      message = await res.text();
    }
    const err: any = new Error(message);
    if (data) err.details = data;
    throw err;
  }
  if (res.status === 204 || res.headers.get('Content-Length') === '0') {
    return undefined;
  }
  const text = await res.text();
  return text ? JSON.parse(text) : undefined;
}

export { API_BASE };

function clearAuthAndRedirect() {
  localStorage.removeItem('role');
  localStorage.removeItem('name');
  localStorage.removeItem('userRole');
  localStorage.removeItem('access');
  localStorage.removeItem('id');
  if (!window.location.pathname.startsWith('/login')) {
    window.location.assign('/login');
  }
}

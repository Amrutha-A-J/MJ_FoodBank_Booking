const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

function getCsrfToken() {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('csrfToken='))?.split('=')[1];
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  const csrf = getCsrfToken();
  if (csrf) headers.set('X-CSRF-Token', csrf);
  init.headers = headers;

  const urlString =
    typeof input === 'string'
      ? input
      : input instanceof URL
      ? input.toString()
      : (input as Request).url;
  const isRefreshCall = urlString.includes('/auth/refresh');

  let res = await fetch(input, { credentials: 'include', ...init });
  if (res.status === 401) {
    if (isRefreshCall) {
      clearAuthAndRedirect();
      return res;
    }
    try {
      const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (refreshRes.ok) {
        try {
          const data = await refreshRes.clone().json();
          if (data?.token) localStorage.setItem('token', data.token);
        } catch {
          // ignore
        }
        res = await fetch(input, { credentials: 'include', ...init });
        if (res.status === 401) clearAuthAndRedirect();
      } else {
        clearAuthAndRedirect();
      }
    } catch {
      clearAuthAndRedirect();
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
  localStorage.removeItem('token');
  localStorage.removeItem('role');
  localStorage.removeItem('name');
  localStorage.removeItem('userRole');
  localStorage.removeItem('access');
  localStorage.removeItem('id');
  if (!window.location.pathname.startsWith('/login')) {
    window.location.assign('/login');
  }
}

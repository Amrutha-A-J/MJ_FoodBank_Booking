import { API_BASE, apiFetch, handleResponse } from './client';
import type { AgencyClient } from '../types';

export async function searchAgencies(query: string) {
  const res = await apiFetch(
    `${API_BASE}/agencies?search=${encodeURIComponent(query)}`,
  );
  return handleResponse(res);
}

let controller: AbortController | null = null;

export async function searchAgencyClients(
  term: string,
): Promise<AgencyClient[]> {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, 300);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });

  const res = await apiFetch(
    `${API_BASE}/agencies/me/clients?search=${encodeURIComponent(term)}`,
    { signal },
  );
  const data = await handleResponse<any[]>(res);
  return Array.isArray(data)
    ? data.map(c => ({
        id: c.id ?? c.client_id!,
        name:
          c.name ??
          c.client_name ??
          `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim(),
        email: c.email,
      }))
    : [];
}

export async function getAgencyClients(agencyId: number | 'me') {
  const res = await apiFetch(`${API_BASE}/agencies/${agencyId}/clients`, {
    method: 'GET',
  });
  return handleResponse(res);
}

export async function getMyAgencyClients() {
  return getAgencyClients('me');
}

export async function addAgencyClient(
  agencyId: number | 'me',
  clientId: number,
): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const res = await apiFetch(`${API_BASE}/agencies/add-client`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ agencyId, clientId }),
  });
  await handleResponse(res);
}

export async function removeAgencyClient(
  agencyId: number | 'me',
  clientId: number,
): Promise<void> {
  const res = await apiFetch(
    `${API_BASE}/agencies/${agencyId}/clients/${clientId}`,
    { method: 'DELETE' },
  );
  await handleResponse(res);
}

export async function createAgency(
  name: string,
  email: string,
  contactInfo?: string,
) {
  const res = await apiFetch(`${API_BASE}/agencies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, contactInfo }),
  });
  return handleResponse(res);
}

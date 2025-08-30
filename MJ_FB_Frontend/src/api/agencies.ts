import { API_BASE, apiFetch, handleResponse } from './client';

export async function searchAgencies(query: string) {
  const res = await apiFetch(
    `${API_BASE}/agencies?search=${encodeURIComponent(query)}`,
  );
  return handleResponse(res);
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

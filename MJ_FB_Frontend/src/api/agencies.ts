import { API_BASE, apiFetch, handleResponse } from './client';

export async function getMyAgencyClients(agencyId: number | 'me') {
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
  const res = await apiFetch(`${API_BASE}/agencies/${agencyId}/clients`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ clientId }),
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

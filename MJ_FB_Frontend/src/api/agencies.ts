import { API_BASE, apiFetch, handleResponse } from './client';

export async function addAgencyClient(agencyId: number, clientId: number) {
  const res = await apiFetch(`${API_BASE}/agencies/${agencyId}/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId }),
  });
  await handleResponse(res);
}

export async function removeAgencyClient(agencyId: number, clientId: number) {
  const res = await apiFetch(
    `${API_BASE}/agencies/${agencyId}/clients/${clientId}`,
    { method: 'DELETE' },
  );
  await handleResponse(res);
}

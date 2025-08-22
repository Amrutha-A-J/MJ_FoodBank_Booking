import { API_BASE, apiFetch, handleResponse } from './client';

export interface Donor {
  id: number;
  name: string;
}

export async function getDonors(): Promise<Donor[]> {
  const res = await apiFetch(`${API_BASE}/donors`);
  return handleResponse(res);
}

export async function createDonor(name: string): Promise<Donor> {
  const res = await apiFetch(`${API_BASE}/donors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return handleResponse(res);
}

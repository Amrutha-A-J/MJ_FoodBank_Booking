import { API_BASE, apiFetch, handleResponse } from './client';

export interface Donation {
  id: number;
  date: string;
  donorId: number;
  donor: string;
  weight: number;
}

export interface DonorAggregation {
  month: string;
  donor: string;
  total: number;
}

export async function getDonations(date: string): Promise<Donation[]> {
  const res = await apiFetch(`${API_BASE}/donations?date=${date}`);
  return handleResponse(res);
}

export async function createDonation(data: { date: string; donorId: number; weight: number }): Promise<Donation> {
  const res = await apiFetch(`${API_BASE}/donations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateDonation(id: number, data: { date: string; donorId: number; weight: number }): Promise<Donation> {
  const res = await apiFetch(`${API_BASE}/donations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteDonation(id: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/donations/${id}`, { method: 'DELETE' });
  await handleResponse(res);
}

export async function getDonorAggregations(year: number): Promise<DonorAggregation[]> {
  const res = await apiFetch(`${API_BASE}/donations/aggregations/donors?year=${year}`);
  return handleResponse(res);
}

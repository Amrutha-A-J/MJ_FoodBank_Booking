import { API_BASE, apiFetch, handleResponse } from './client';

export interface Donation {
  id: number;
  date: string;
  donorId: number;
  donor: {
    id: number;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
  };
  weight: number;
}

export async function getDonations(date: string): Promise<Donation[]> {
  const res = await apiFetch(`${API_BASE}/donations?date=${date}`);
  return handleResponse(res);
}

export async function getDonationsByMonth(month: string): Promise<Donation[]> {
  const res = await apiFetch(`${API_BASE}/donations?month=${month}`);
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

export interface DonorAggregation {
  donor: string;
  monthlyTotals: number[];
  total: number;
}

export async function getDonorAggregations(year: number): Promise<DonorAggregation[]> {
  const res = await apiFetch(`${API_BASE}/donations/aggregations?year=${year}`);
  return handleResponse(res);
}

export async function exportDonorAggregations(year: number): Promise<Blob> {
  const res = await apiFetch(`${API_BASE}/donations/aggregations/export?year=${year}`);
  if (!res.ok) await handleResponse(res);
  return res.blob();
}

export async function postManualDonorAggregation(data: {
  year: number;
  month: number;
  donorEmail: string;
  total: number;
}): Promise<void> {
  const res = await apiFetch(`${API_BASE}/donations/aggregations/manual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  await handleResponse(res);
}

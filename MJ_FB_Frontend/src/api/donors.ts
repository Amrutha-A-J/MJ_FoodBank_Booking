import { API_BASE, apiFetch, handleResponse } from './client';

export interface Donor {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
}

export interface TopDonor {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  totalLbs: number;
  lastDonationISO: string;
}

export interface DonorDetail extends Donor {
  totalLbs: number;
  lastDonationISO: string | null;
}

export interface DonorDonation {
  id: number;
  date: string;
  weight: number;
}

export async function getDonors(search?: string): Promise<Donor[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const res = await apiFetch(`${API_BASE}/donors${query}`);
  return handleResponse(res);
}

export async function createDonor(data: {
  firstName: string;
  lastName: string;
  email: string;
}): Promise<Donor> {
  const res = await apiFetch(`${API_BASE}/donors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function getDonor(id: number): Promise<DonorDetail> {
  const res = await apiFetch(`${API_BASE}/donors/${id}`);
  return handleResponse(res);
}

export async function getDonorDonations(
  id: number,
): Promise<DonorDonation[]> {
  const res = await apiFetch(`${API_BASE}/donors/${id}/donations`);
  return handleResponse(res);
}

// Fetch the top donors for a given year.
// `limit` defaults to 7, mirroring the dashboard display.
export async function getTopDonors(
  year: number,
  limit = 7,
): Promise<TopDonor[]> {
  const res = await apiFetch(
    `${API_BASE}/donors/top?year=${year}&limit=${limit}`,
  );
  return handleResponse(res);
}

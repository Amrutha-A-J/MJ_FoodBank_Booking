import { API_BASE, apiFetch, handleResponse, jsonApiFetch } from './client';

export interface DonorContact {
  email?: string | null;
  phone?: string | null;
}

export interface Donor {
  id: number;
  name: string;
  contact: DonorContact | null;
  isPetFood: boolean;
}

export interface TopDonor extends Donor {
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

interface DonorPayload {
  name: string;
  contact?: DonorContact | null;
  isPetFood?: boolean;
}

export async function createDonor(data: DonorPayload): Promise<Donor> {
  const res = await jsonApiFetch(`${API_BASE}/donors`, {
    method: 'POST',
    body: {
      name: data.name,
      contact: data.contact ?? null,
      isPetFood: data.isPetFood ?? false,
    },
  });
  return handleResponse(res);
}

export async function getDonor(id: number): Promise<DonorDetail> {
  const res = await apiFetch(`${API_BASE}/donors/${id}`);
  return handleResponse(res);
}

export async function updateDonor(
  id: number,
  data: DonorPayload,
): Promise<Donor> {
  const res = await jsonApiFetch(`${API_BASE}/donors/${id}`, {
    method: 'PUT',
    body: {
      name: data.name,
      contact: data.contact ?? null,
      isPetFood: data.isPetFood ?? false,
    },
  });
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

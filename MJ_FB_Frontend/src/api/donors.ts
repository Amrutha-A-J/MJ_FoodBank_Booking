import { API_BASE, apiFetch, handleResponse, jsonApiFetch } from './client';

interface DonorContactData {
  email?: string | null;
  phone?: string | null;
}

export interface Donor {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
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

interface DonorApiResponse {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  contact?: DonorContactData | null;
  isPetFood: boolean;
}

interface TopDonorApiResponse extends DonorApiResponse {
  totalLbs: number;
  lastDonationISO: string;
}

interface DonorDetailApiResponse extends DonorApiResponse {
  totalLbs: number;
  lastDonationISO: string | null;
}

function normalizeDonor(donor: DonorApiResponse): Donor {
  const { contact } = donor;
  return {
    id: donor.id,
    name: donor.name,
    email: donor.email ?? contact?.email ?? null,
    phone: donor.phone ?? contact?.phone ?? null,
    isPetFood: donor.isPetFood,
  };
}

function normalizeTopDonor(donor: TopDonorApiResponse): TopDonor {
  return {
    ...normalizeDonor(donor),
    totalLbs: donor.totalLbs,
    lastDonationISO: donor.lastDonationISO,
  };
}

function normalizeDonorDetail(donor: DonorDetailApiResponse): DonorDetail {
  return {
    ...normalizeDonor(donor),
    totalLbs: donor.totalLbs,
    lastDonationISO: donor.lastDonationISO ?? null,
  };
}

export async function getDonors(search?: string): Promise<Donor[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const res = await apiFetch(`${API_BASE}/donors${query}`);
  const data = await handleResponse<DonorApiResponse[]>(res);
  return data.map(normalizeDonor);
}

interface DonorPayload {
  name: string;
  email?: string | null;
  phone?: string | null;
  isPetFood?: boolean;
}

export async function createDonor(data: DonorPayload): Promise<Donor> {
  const res = await jsonApiFetch(`${API_BASE}/donors`, {
    method: 'POST',
    body: {
      name: data.name,
      email: data.email ?? null,
      phone: data.phone ?? null,
      isPetFood: data.isPetFood ?? false,
    },
  });
  const donor = await handleResponse<DonorApiResponse>(res);
  return normalizeDonor(donor);
}

export async function getDonor(id: number): Promise<DonorDetail> {
  const res = await apiFetch(`${API_BASE}/donors/${id}`);
  const donor = await handleResponse<DonorDetailApiResponse>(res);
  return normalizeDonorDetail(donor);
}

export async function updateDonor(
  id: number,
  data: DonorPayload,
): Promise<Donor> {
  const res = await jsonApiFetch(`${API_BASE}/donors/${id}`, {
    method: 'PUT',
    body: {
      name: data.name,
      email: data.email ?? null,
      phone: data.phone ?? null,
      isPetFood: data.isPetFood ?? false,
    },
  });
  const donor = await handleResponse<DonorApiResponse>(res);
  return normalizeDonor(donor);
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
  const donors = await handleResponse<TopDonorApiResponse[]>(res);
  return donors.map(normalizeTopDonor);
}

import { API_BASE, apiFetch, handleResponse, jsonApiFetch } from './client';

interface DonorContactResponse {
  email?: string | null;
  phone?: string | null;
  contact?: {
    email?: string | null;
    phone?: string | null;
  } | null;
}

type NormalizedDonor<T extends DonorResponseBase> = Omit<T, 'contact' | 'email' | 'phone'> & {
  email: string | null;
  phone: string | null;
};

interface DonorResponseBase extends DonorContactResponse {
  id: number;
  name: string;
  isPetFood: boolean;
}

export type Donor = NormalizedDonor<DonorResponseBase>;

export type TopDonor = NormalizedDonor<
  DonorResponseBase & {
    totalLbs: number;
    lastDonationISO: string;
  }
>;

export type DonorDetail = NormalizedDonor<
  DonorResponseBase & {
    totalLbs: number;
    lastDonationISO: string | null;
  }
>;

type TopDonorResponse = DonorResponseBase & {
  totalLbs: number;
  lastDonationISO: string;
};

type DonorDetailResponse = DonorResponseBase & {
  totalLbs: number;
  lastDonationISO: string | null;
};

export interface DonorDonation {
  id: number;
  date: string;
  weight: number;
}

function extractContact(data: DonorContactResponse): { email: string | null; phone: string | null } {
  const email = data.email ?? data.contact?.email ?? null;
  const phone = data.phone ?? data.contact?.phone ?? null;
  return {
    email: email ?? null,
    phone: phone ?? null,
  };
}

function normalizeDonor<T extends DonorResponseBase>(donor: T): NormalizedDonor<T> {
  const { contact, ...rest } = donor;
  const { email, phone } = extractContact(donor);
  return {
    ...rest,
    email,
    phone,
  } as NormalizedDonor<T>;
}

export async function getDonors(search?: string): Promise<Donor[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const res = await apiFetch(`${API_BASE}/donors${query}`);
  const data = await handleResponse<DonorResponseBase[]>(res);
  return data.map(donor => normalizeDonor(donor));
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
  const donor = await handleResponse<DonorResponseBase>(res);
  return normalizeDonor(donor);
}

export async function getDonor(id: number): Promise<DonorDetail> {
  const res = await apiFetch(`${API_BASE}/donors/${id}`);
  const donor = await handleResponse<DonorDetailResponse>(res);
  return normalizeDonor(donor);
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
  const donor = await handleResponse<DonorResponseBase>(res);
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
  const donors = await handleResponse<TopDonorResponse[]>(res);
  return donors.map(donor => normalizeDonor(donor));
}


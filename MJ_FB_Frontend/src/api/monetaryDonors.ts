import { API_BASE, apiFetch, handleResponse } from './client';

export interface MonetaryDonor {
  id: number;
  name: string;
  email?: string;
}

export interface MonetaryDonation {
  id: number;
  donorId: number;
  amount: number;
  date: string;
}

export interface MailingList {
  id: number;
  name: string;
  donors: MonetaryDonor[];
}

export async function getMonetaryDonors(): Promise<MonetaryDonor[]> {
  const res = await apiFetch(`${API_BASE}/monetary-donors`);
  return handleResponse(res);
}

export async function createMonetaryDonor(
  data: Pick<MonetaryDonor, 'name' | 'email'>,
): Promise<MonetaryDonor> {
  const res = await apiFetch(`${API_BASE}/monetary-donors`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateMonetaryDonor(
  id: number,
  data: Pick<MonetaryDonor, 'name' | 'email'>,
): Promise<MonetaryDonor> {
  const res = await apiFetch(`${API_BASE}/monetary-donors/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteMonetaryDonor(id: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/monetary-donors/${id}`, {
    method: 'DELETE',
  });
  await handleResponse(res);
}

export async function getMonetaryDonations(
  donorId: number,
): Promise<MonetaryDonation[]> {
  const res = await apiFetch(
    `${API_BASE}/monetary-donors/${donorId}/donations`,
  );
  return handleResponse(res);
}

export async function createMonetaryDonation(
  donorId: number,
  data: Pick<MonetaryDonation, 'amount' | 'date'>,
): Promise<MonetaryDonation> {
  const res = await apiFetch(
    `${API_BASE}/monetary-donors/${donorId}/donations`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
  );
  return handleResponse(res);
}

export async function updateMonetaryDonation(
  donorId: number,
  donationId: number,
  data: Pick<MonetaryDonation, 'amount' | 'date'>,
): Promise<MonetaryDonation> {
  const res = await apiFetch(
    `${API_BASE}/monetary-donors/${donorId}/donations/${donationId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
  );
  return handleResponse(res);
}

export async function deleteMonetaryDonation(
  donorId: number,
  donationId: number,
): Promise<void> {
  const res = await apiFetch(
    `${API_BASE}/monetary-donors/${donorId}/donations/${donationId}`,
    {
      method: 'DELETE',
    },
  );
  await handleResponse(res);
}

export async function getMailingLists(
  month: number,
  year: number,
): Promise<MailingList[]> {
  const res = await apiFetch(
    `${API_BASE}/monetary-donors/mailing-lists?month=${month}&year=${year}`,
  );
  return handleResponse(res);
}

export async function sendMailingListEmails(
  month: number,
  year: number,
): Promise<void> {
  const res = await apiFetch(
    `${API_BASE}/monetary-donors/mailing-lists/send`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, year }),
    },
  );
  await handleResponse(res);
}


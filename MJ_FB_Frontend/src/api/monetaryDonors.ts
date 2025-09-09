import { API_BASE, apiFetch, handleResponse } from './client';

export interface MonetaryDonor {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
}

export interface MonetaryDonation {
  id: number;
  donorId: number;
  amount: number;
  date: string;
}

export interface MailListDonor {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  amount: number;
}

export interface MailLists {
  '1-100': MailListDonor[];
  '101-500': MailListDonor[];
  '501+': MailListDonor[];
}

export async function getMonetaryDonors(search?: string): Promise<MonetaryDonor[]> {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const res = await apiFetch(`${API_BASE}/monetary-donors${query}`);
  return handleResponse(res);
}

export async function createMonetaryDonor(
  data: Pick<MonetaryDonor, 'firstName' | 'lastName' | 'email'>,
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
  data: Pick<MonetaryDonor, 'firstName' | 'lastName' | 'email'>,
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

export async function getMailLists(
  year: number,
  month: number,
): Promise<MailLists> {
  const res = await apiFetch(
    `${API_BASE}/monetary-donors/mail-lists?year=${year}&month=${month}`,
  );
  return handleResponse(res);
}

export async function sendMailListEmails(
  year: number,
  month: number,
  templateId: number,
): Promise<void> {
  const res = await apiFetch(
    `${API_BASE}/monetary-donors/mail-lists/send`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month, templateId }),
    },
  );
  await handleResponse(res);
}


import { API_BASE, apiFetch, handleResponse } from './client';

export interface OutgoingDonation {
  id: number;
  date: string;
  receiverId: number;
  receiver: string;
  weight: number;
  note?: string | null;
}

export async function getOutgoingDonations(date: string): Promise<OutgoingDonation[]> {
  const res = await apiFetch(`${API_BASE}/outgoing-donations?date=${date}`);
  return handleResponse(res);
}

export async function createOutgoingDonation(data: { date: string; receiverId: number; weight: number; note?: string }): Promise<OutgoingDonation> {
  const res = await apiFetch(`${API_BASE}/outgoing-donations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateOutgoingDonation(id: number, data: { date: string; receiverId: number; weight: number; note?: string }): Promise<OutgoingDonation> {
  const res = await apiFetch(`${API_BASE}/outgoing-donations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteOutgoingDonation(id: number): Promise<void> {
  const res = await apiFetch(`${API_BASE}/outgoing-donations/${id}`, { method: 'DELETE' });
  await handleResponse(res);
}

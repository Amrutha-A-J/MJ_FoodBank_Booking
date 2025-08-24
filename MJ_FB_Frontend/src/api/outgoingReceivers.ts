import { API_BASE, apiFetch, handleResponse } from './client';

export interface OutgoingReceiver {
  id: number;
  name: string;
}

export interface TopReceiver {
  name: string;
  totalLbs: number;
  lastPickupISO: string;
}

export async function getOutgoingReceivers(): Promise<OutgoingReceiver[]> {
  const res = await apiFetch(`${API_BASE}/outgoing-receivers`);
  return handleResponse(res);
}

export async function createOutgoingReceiver(name: string): Promise<OutgoingReceiver> {
  const res = await apiFetch(`${API_BASE}/outgoing-receivers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  return handleResponse(res);
}

// Fetch the top receivers for a given year.
// `limit` defaults to 7, matching the donor list.
export async function getTopReceivers(
  year: number,
  limit = 7,
): Promise<TopReceiver[]> {
  const res = await apiFetch(
    `${API_BASE}/outgoing-receivers/top?year=${year}&limit=${limit}`,
  );
  const data: { name: string; totalKg: number; lastPickupISO: string }[] =
    await handleResponse(res);
  return data.map(r => ({
    name: r.name,
    totalLbs: r.totalKg,
    lastPickupISO: r.lastPickupISO,
  }));
}

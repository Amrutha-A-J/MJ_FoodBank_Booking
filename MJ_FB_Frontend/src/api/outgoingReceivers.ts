import { API_BASE, apiFetch, handleResponse, jsonApiFetch } from './client';

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
  const res = await jsonApiFetch(`${API_BASE}/outgoing-receivers`, {
    method: 'POST',
    body: { name },
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
  return handleResponse(res);
}

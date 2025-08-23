import { API_BASE, apiFetch, handleResponse } from './client';

export interface OutgoingReceiver {
  id: number;
  name: string;
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

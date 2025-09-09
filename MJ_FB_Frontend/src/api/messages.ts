import { API_BASE, apiFetch, handleResponse } from './client';

export interface Message {
  id: number;
  volunteer_id: number;
  sender_role: string;
  body: string;
  created_at: string;
}

export async function getMessages(volunteerId?: number): Promise<Message[]> {
  const query = volunteerId ? `?volunteerId=${volunteerId}` : '';
  const res = await apiFetch(`${API_BASE}/messages${query}`);
  return handleResponse(res);
}

export async function sendMessage(text: string, volunteerId?: number): Promise<Message> {
  const body: any = { text };
  if (volunteerId) body.volunteerId = volunteerId;
  const res = await apiFetch(`${API_BASE}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

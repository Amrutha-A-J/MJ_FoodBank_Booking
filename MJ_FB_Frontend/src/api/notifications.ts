import { apiFetch, handleResponse } from './client';

export async function registerPushToken(token: string): Promise<void> {
  const res = await apiFetch('/api/notifications/register', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
  await handleResponse(res);
}

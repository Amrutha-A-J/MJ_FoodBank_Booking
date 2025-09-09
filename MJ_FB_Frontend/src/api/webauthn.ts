import { API_BASE, apiFetch, handleResponse } from './client';
import type { LoginResponse } from '../types';

export async function registerWebAuthnCredential(
  credentialId: string,
): Promise<void> {
  const res = await apiFetch(`${API_BASE}/webauthn/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credentialId }),
  });
  await handleResponse(res);
}

export async function verifyWebAuthn(
  credentialId: string,
): Promise<LoginResponse> {
  const res = await apiFetch(`${API_BASE}/webauthn/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credentialId }),
  });
  return handleResponse<LoginResponse>(res);
}

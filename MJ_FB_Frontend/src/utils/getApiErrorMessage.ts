import type { ApiError } from '../api/client';

export default function getApiErrorMessage(err: unknown, fallback: string): string {
  const apiErr = err as ApiError;
  const detailMessage = apiErr.details?.errors?.[0]?.message;
  if (typeof detailMessage === 'string' && detailMessage) {
    return detailMessage;
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  if (typeof err === 'string' && err) {
    return err;
  }
  return fallback;
}

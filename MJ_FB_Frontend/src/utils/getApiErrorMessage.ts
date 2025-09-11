import type { ApiError } from '../api/client';

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const apiErr = err as ApiError;
    const details = (apiErr.details as any)?.errors;
    if (Array.isArray(details) && details[0]?.message) {
      return details[0].message as string;
    }
    if ('message' in apiErr && typeof apiErr.message === 'string') {
      return apiErr.message;
    }
  } else if (err instanceof Error) {
    return err.message;
  }
  return fallback;
}

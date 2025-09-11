import type { ApiError } from '../api/client';

export default function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const err = error as Partial<ApiError>;
    if (typeof err.message === 'string' && err.message) {
      return err.message;
    }
    const details = err.details as any;
    if (details && typeof details === 'object') {
      if (typeof details.message === 'string' && details.message) {
        return details.message;
      }
      if (typeof details.error === 'string' && details.error) {
        return details.error;
      }
    }
  }
  return fallback;
}

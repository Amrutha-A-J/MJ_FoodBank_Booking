import { getApiErrorMessage } from '../getApiErrorMessage';
import type { ApiError } from '../../api/client';

describe('getApiErrorMessage', () => {
  test('returns first detail error message for ApiError', () => {
    const err = new Error('Top level') as ApiError;
    err.details = { errors: [{ message: 'Detailed error' }] };
    expect(getApiErrorMessage(err, 'fallback')).toBe('Detailed error');
  });

  test('falls back to error message', () => {
    const err = new Error('Simple error');
    expect(getApiErrorMessage(err, 'fallback')).toBe('Simple error');
  });

  test('returns fallback when no message', () => {
    expect(getApiErrorMessage(null, 'fallback')).toBe('fallback');
  });
});

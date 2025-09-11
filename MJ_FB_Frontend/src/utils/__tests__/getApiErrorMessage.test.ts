import getApiErrorMessage from '../getApiErrorMessage';
import type { ApiError } from '../../api/client';

describe('getApiErrorMessage', () => {
  it('returns detail error message when present', () => {
    const err: ApiError = new Error('ignored');
    err.details = { errors: [{ message: 'detail message' }] };
    expect(getApiErrorMessage(err, 'fallback')).toBe('detail message');
  });

  it('returns error.message when no details', () => {
    const err = new Error('plain');
    expect(getApiErrorMessage(err, 'fallback')).toBe('plain');
  });

  it('falls back when message is unavailable', () => {
    expect(getApiErrorMessage(undefined, 'fallback')).toBe('fallback');
  });
});

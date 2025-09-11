import getApiErrorMessage from '../getApiErrorMessage';

describe('getApiErrorMessage', () => {
  it('returns message from Error object', () => {
    const err = new Error('boom');
    expect(getApiErrorMessage(err, 'fallback')).toBe('boom');
  });

  it('uses details.message when available', () => {
    const err = new Error('ignored');
    (err as any).details = { message: 'detail' };
    expect(getApiErrorMessage(err, 'fallback')).toBe('detail');
  });

  it('returns fallback for unknown errors', () => {
    expect(getApiErrorMessage(undefined, 'fallback')).toBe('fallback');
  });
});

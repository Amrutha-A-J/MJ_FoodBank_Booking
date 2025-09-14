import UnauthorizedError from '../src/utils/UnauthorizedError';

describe('UnauthorizedError', () => {
  it('defaults message and status', () => {
    const err = new UnauthorizedError();
    expect(err.message).toBe('Invalid credentials');
    expect(err.status).toBe(401);
  });

  it('allows overriding message', () => {
    const err = new UnauthorizedError('Custom message');
    expect(err.message).toBe('Custom message');
    expect(err.status).toBe(401);
  });
});

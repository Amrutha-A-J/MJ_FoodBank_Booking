import UnauthorizedError from '../../src/utils/UnauthorizedError';

describe('UnauthorizedError', () => {
  it('sets default message along with name and status', () => {
    const err = new UnauthorizedError();

    expect(err.message).toBe('Invalid credentials');
    expect(err.name).toBe('UnauthorizedError');
    expect(err.status).toBe(401);
  });

  it('preserves name and status when overriding the message', () => {
    const err = new UnauthorizedError('Custom message');

    expect(err.message).toBe('Custom message');
    expect(err.name).toBe('UnauthorizedError');
    expect(err.status).toBe(401);
  });
});

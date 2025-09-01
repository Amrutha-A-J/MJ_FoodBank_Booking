import type { Request } from 'express';

describe('Request user typing', () => {
  it('provides typed user fields', () => {
    const req = {} as Request;
    req.user?.id;
    req.user?.userId;
    req.user?.userRole;
    req.user?.access;
    // @ts-expect-error - arbitrary fields are not allowed
    req.user?.foo;
    expect(true).toBe(true);
  });
});

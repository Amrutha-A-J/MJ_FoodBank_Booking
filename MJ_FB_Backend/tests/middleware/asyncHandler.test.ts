import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../../src/middleware/asyncHandler';

describe('asyncHandler middleware', () => {
  const waitForMicrotask = () => new Promise((resolve) => setImmediate(resolve));

  it('invokes the handler and calls next without arguments when it resolves', async () => {
    const handler = jest.fn<Promise<void>, [Request, Response, NextFunction]>().mockResolvedValue();
    const wrapped = asyncHandler(handler);
    const req = {} as Request;
    const res = {} as Response;
    const next = jest.fn();

    wrapped(req, res, next);
    await waitForMicrotask();

    expect(handler).toHaveBeenCalledWith(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('forwards errors from the handler to next', async () => {
    const error = new Error('boom');
    const handler = jest
      .fn<Promise<void>, [Request, Response, NextFunction]>()
      .mockRejectedValue(error);
    const wrapped = asyncHandler(handler);
    const req = {} as Request;
    const res = {} as Response;
    const next = jest.fn();

    wrapped(req, res, next);
    await waitForMicrotask();

    expect(handler).toHaveBeenCalledWith(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});

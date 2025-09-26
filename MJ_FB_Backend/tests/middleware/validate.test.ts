import { z } from 'zod';
import type { NextFunction, Request, Response } from 'express';
import { validate, validateParams } from '../../src/middleware/validate';

describe('validate middleware', () => {
  const createMocks = () => {
    const req = { body: {} } as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    return { req, res, next };
  };

  it('replaces req.body with parsed data and calls next on success', () => {
    const schema = z.object({ name: z.string() });
    const { req, res, next } = createMocks();
    req.body = { name: 'Moose Jaw Food Bank' };

    validate(schema)(req, res, next);

    expect(req.body).toEqual({ name: 'Moose Jaw Food Bank' });
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('returns a 400 response with Zod issues when validation fails', () => {
    const schema = z.object({ name: z.string() });
    const { req, res, next } = createMocks();
    req.body = { name: 123 };

    validate(schema)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ errors: expect.any(Array) });
    const issues = (res.json as jest.Mock).mock.calls[0][0].errors;
    expect(Array.isArray(issues)).toBe(true);
    expect(issues[0]).toEqual(expect.objectContaining({ path: ['name'] }));
    expect(next).not.toHaveBeenCalled();
  });

  it('passes non-Zod errors to next', () => {
    const error = new Error('unexpected');
    const schema = {
      parse: jest.fn(() => {
        throw error;
      }),
    } as unknown as z.ZodTypeAny;
    const { req, res, next } = createMocks();

    validate(schema)(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});

describe('validateParams middleware', () => {
  const createMocks = () => {
    const req = { params: {} } as unknown as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    return { req, res, next };
  };

  it('replaces req.params with parsed data and calls next on success', () => {
    const schema = z.object({ id: z.string().min(1) });
    const { req, res, next } = createMocks();
    req.params = { id: '123' } as Request['params'];

    validateParams(schema)(req, res, next);

    expect(req.params).toEqual({ id: '123' });
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('returns a 400 response with Zod issues when params validation fails', () => {
    const schema = z.object({ id: z.string().min(1) });
    const { req, res, next } = createMocks();
    req.params = { id: '' } as Request['params'];

    validateParams(schema)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ errors: expect.any(Array) });
    const issues = (res.json as jest.Mock).mock.calls[0][0].errors;
    expect(Array.isArray(issues)).toBe(true);
    expect(issues[0]).toEqual(expect.objectContaining({ path: ['id'] }));
    expect(next).not.toHaveBeenCalled();
  });

  it('passes non-Zod errors to next', () => {
    const error = new Error('params failure');
    const schema = {
      parse: jest.fn(() => {
        throw error;
      }),
    } as unknown as z.ZodTypeAny;
    const { req, res, next } = createMocks();

    validateParams(schema)(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });
});

import { NextFunction, Request, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ZodError, ZodTypeAny, z } from 'zod';

// Middleware factory that validates the request body against a Zod schema.
// If validation passes, the parsed data replaces `req.body`.
// If validation fails, a 400 response with error details is returned.
export function validate(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ errors: err.issues });
      }
      next(err);
    }
  };
}


// Middleware factory that validates the request params against a Zod schema.
// If validation passes, the parsed data replaces `req.params`.
// If validation fails, a 400 response with error details is returned.
export function validateParams<T extends ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params) as z.infer<T> as unknown as ParamsDictionary;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({ errors: err.issues });
      }
      next(err);
    }
  };
}


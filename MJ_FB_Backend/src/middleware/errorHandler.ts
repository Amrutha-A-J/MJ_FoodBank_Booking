import { Request, Response, NextFunction } from 'express';
import { buildErrorResponse } from '../utils/errorResponse';
import { alertOps } from '../utils/opsAlert';

const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const { status, body } = buildErrorResponse(err);
  if (status >= 500) {
    void alertOps(`${req.method} ${req.path}`, err);
  }
  res.status(status).json(body);
};

export default errorHandler;

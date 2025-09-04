import { Request, Response, NextFunction } from 'express';
import { buildErrorResponse } from '../utils/errorResponse';

const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const { status, body } = buildErrorResponse(err);

  res.status(status).json(body);
};

export default errorHandler;

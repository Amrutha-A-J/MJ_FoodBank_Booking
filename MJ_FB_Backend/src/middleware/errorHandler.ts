import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  const status =
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    typeof (err as any).status === 'number'
      ? (err as any).status
      : typeof err === 'object' &&
        err !== null &&
        'statusCode' in err &&
        typeof (err as any).statusCode === 'number'
      ? (err as any).statusCode
      : 500;

  const originalMessage =
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as any).message === 'string'
      ? (err as any).message
      : 'Unknown error';

  logger.error('Unhandled error:', originalMessage, err);

  const code =
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as any).code === 'string'
      ? (err as any).code
      : 'UNKNOWN';

  const safeMessage = status === 500 ? 'Internal Server Error' : originalMessage;

  const responseBody: {
    message: string;
    error: { code: string; message: string };
    stack?: string;
  } = {
    message: safeMessage,
    error: { code, message: safeMessage },
  };

  if (
    process.env.NODE_ENV !== 'production' &&
    typeof err === 'object' &&
    err !== null &&
    'stack' in err &&
    typeof (err as any).stack === 'string'
  ) {
    responseBody.stack = (err as any).stack;
  }

  res.status(status).json(responseBody);
};

export default errorHandler;

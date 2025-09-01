import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const originalMessage = err.message || 'Unknown error';
  logger.error('Unhandled error:', originalMessage, err);
  const responseBody: { message: string; stack?: string } = {
    message: status === 500 ? 'Internal Server Error' : originalMessage,
  };

  if (process.env.NODE_ENV !== 'production' && err.stack) {
    responseBody.stack = err.stack;
  }

  res.status(status).json(responseBody);
};

export default errorHandler;

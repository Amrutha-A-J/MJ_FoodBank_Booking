import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const originalMessage = err.message || 'Unknown error';
  logger.error('Unhandled error:', originalMessage, err);
  res.status(status).json({
    message: status === 500 ? 'Internal Server Error' : originalMessage,
  });
};

export default errorHandler;

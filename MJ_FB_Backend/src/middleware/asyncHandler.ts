import { RequestHandler } from 'express';

const asyncHandler = <T extends RequestHandler>(fn: T): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;

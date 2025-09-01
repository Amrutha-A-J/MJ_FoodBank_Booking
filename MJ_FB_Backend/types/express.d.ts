import type { RequestUser } from '../src/types/RequestUser';

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}

export {};

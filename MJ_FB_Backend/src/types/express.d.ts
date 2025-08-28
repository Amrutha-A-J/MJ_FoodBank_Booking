import type { AuthUser } from './AuthUser';

declare global {
  namespace Express {
    interface Request extends Express.Request {
      user?: AuthUser;
    }
  }
}

export {};

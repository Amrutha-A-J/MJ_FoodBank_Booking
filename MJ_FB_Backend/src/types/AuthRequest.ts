import type { Request } from 'express';
import type { AuthenticatedUser } from './AuthenticatedUser';

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

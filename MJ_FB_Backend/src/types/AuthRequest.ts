import type { Request } from 'express';
import type { RequestUser } from './RequestUser';

export interface AuthRequest extends Request {
  user?: RequestUser;
}

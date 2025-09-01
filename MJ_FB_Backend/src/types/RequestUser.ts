import type { AuthenticatedUser } from './AuthenticatedUser';

export interface RequestUser extends AuthenticatedUser {
  type: 'user' | 'staff' | 'volunteer' | 'agency';
  email?: string;
  phone?: string;
  name?: string;
  userRole?: 'shopper' | 'delivery';
  access?: string[];
}

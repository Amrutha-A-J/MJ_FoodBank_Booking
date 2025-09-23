import type { AuthenticatedUser } from './AuthenticatedUser';

export interface RequestUser extends AuthenticatedUser {
  type: 'user' | 'staff' | 'volunteer';
  email?: string | null;
  phone?: string;
  address?: string;
  name?: string;
  userRole?: 'shopper' | 'delivery';
  access?: string[];
}

import type { StaffAccess } from '../models/staff';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: 'shopper' | 'delivery' | 'staff' | 'volunteer';
        email?: string;
        userId?: string;
        userRole?: 'shopper' | 'delivery';
        access?: StaffAccess[];
      };
    }
  }
}

export {};

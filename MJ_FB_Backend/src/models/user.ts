export type UserRole = 'shopper' | 'delivery';

export interface User {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  clientId: number;
  role: UserRole;
  bookingsThisMonth: number;
  bookingCountLastUpdated: string;
  password?: string | null;
  onlineAccess: boolean;
  consent: boolean;
}
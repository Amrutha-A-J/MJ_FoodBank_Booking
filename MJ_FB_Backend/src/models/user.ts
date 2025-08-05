export type UserRole = 'shopper' | 'delivery';

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  clientId: number;
  role: UserRole;
  bookingsThisMonth: number;
  bookingCountLastUpdated: string;
  password: string;
}
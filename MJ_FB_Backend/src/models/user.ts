export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  clientId: number;
  role: 'shopper' | 'delivery';
  bookingsThisMonth: number;
  bookingCountLastUpdated: string;
  password?: string;
}
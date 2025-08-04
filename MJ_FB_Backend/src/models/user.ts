export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'shopper' | 'delivery' | 'staff';
  phone?: string;
}
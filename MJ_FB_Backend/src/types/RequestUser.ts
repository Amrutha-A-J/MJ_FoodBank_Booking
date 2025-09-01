export interface RequestUser {
  id: string;
  role: string;
  type: 'user' | 'staff' | 'volunteer' | 'agency';
  email?: string;
  phone?: string;
  name?: string;
  userId?: string;
  userRole?: 'shopper' | 'delivery';
  access?: string[];
}

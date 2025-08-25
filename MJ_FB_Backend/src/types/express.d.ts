declare namespace Express {
  export interface Request {
    user?: {
      id: string;
      role: 'shopper' | 'delivery' | 'staff' | 'volunteer' | 'agency';
      type?: 'user' | 'staff' | 'volunteer' | 'agency';
      email?: string;
      phone?: string;
      name?: string;
      userId?: string;
      userRole?: 'shopper' | 'delivery';
      access?: string[];
    };
  }
}

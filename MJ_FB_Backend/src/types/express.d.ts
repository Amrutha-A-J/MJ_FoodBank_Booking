declare namespace Express {
  export interface Request {
    user?: {
      id: string;
      role: 'shopper' | 'delivery' | 'staff' | 'volunteer' | 'agency';
      email?: string;
      userId?: string;
      userRole?: 'shopper' | 'delivery';
      access?: string[];
    };
  }
}

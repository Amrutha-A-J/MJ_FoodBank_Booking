declare namespace Express {
  export interface Request {
    user?: {
      id: string;
      role: 'shopper' | 'delivery' | 'staff' | 'volunteer';
      email?: string;
      userId?: string;
      userRole?: 'shopper' | 'delivery';
      access?: string[];
    };
  }
}

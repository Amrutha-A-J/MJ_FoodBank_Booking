declare namespace Express {
  export interface Request {
    user?: {
      id: string;
      role: 'shopper' | 'delivery' | 'staff' | 'admin' | 'volunteer';
      email?: string;
      userId?: string;
      userRole?: 'shopper' | 'delivery';
    };
  }
}

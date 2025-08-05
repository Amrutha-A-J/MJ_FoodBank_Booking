declare namespace Express {
  export interface Request {
    user?: {
      id: string;
      role: 'shopper' | 'delivery' | 'staff' | 'volunteer_coordinator' | 'admin';
    };
  }
}

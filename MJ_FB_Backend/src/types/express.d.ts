declare namespace Express {
  export interface Request {
    user?: {
      id: string;
      role: 'shopper' | 'delivery' | 'staff';
    };
  }
}

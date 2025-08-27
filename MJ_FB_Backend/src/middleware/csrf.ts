import { Request, Response, NextFunction } from 'express';
import cookie from 'cookie';

export default function csrfMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }
  const headerToken = req.headers['x-csrf-token'];
  const header = req.headers.cookie;
  let cookieToken: string | undefined;
  if (header) {
    const cookies = cookie.parse(header);
    cookieToken = cookies.csrfToken;
  }
  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return res.status(403).json({ message: 'Invalid CSRF token' });
  }
  return next();
}

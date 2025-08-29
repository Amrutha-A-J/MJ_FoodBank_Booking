import { Request, Response, NextFunction } from 'express';
import { getBadgeCardLink } from '../utils/badgeUtils';

export function getStats(req: Request, res: Response, _next: NextFunction) {
  const email = (req.query.email as string) || '';
  const cardUrl = email ? getBadgeCardLink(email) : undefined;
  res.json({ cardUrl });
}

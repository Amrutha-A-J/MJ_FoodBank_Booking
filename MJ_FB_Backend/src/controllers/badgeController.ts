import { Request, Response, NextFunction } from 'express';
import { awardMilestoneBadge } from '../utils/badgeUtils';

export function awardBadge(req: Request, res: Response, _next: NextFunction) {
  const { email, badge } = req.body as { email: string; badge: string };
  if (!email || !badge) {
    return res.status(400).json({ message: 'Email and badge required' });
  }
  const cardUrl = awardMilestoneBadge(email, badge);
  res.json({ cardUrl });
}

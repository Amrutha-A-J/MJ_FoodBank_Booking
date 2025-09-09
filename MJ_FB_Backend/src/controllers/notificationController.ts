import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../types/AuthRequest';
import { savePushToken } from '../models/pushToken';

export async function registerPushToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const user = req.user;
    const { token } = req.body as { token?: string };
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (!token) return res.status(400).json({ message: 'Token required' });
    await savePushToken(Number(user.userId ?? user.id), user.type, token);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

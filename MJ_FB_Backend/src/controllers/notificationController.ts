import { Request, Response } from 'express';
import { upsertPushToken } from '../models/pushToken';

export async function registerToken(req: Request, res: Response) {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: 'Token required' });
  const role = user.type === 'volunteer' ? 'volunteer' : 'client';
  await upsertPushToken(Number(user.id), role, token);
  res.json({ message: 'Registered' });
}

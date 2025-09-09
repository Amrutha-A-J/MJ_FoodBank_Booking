import { Request, Response, NextFunction } from 'express';
import { createMessage, getMessagesForVolunteer } from '../models/messages';
import { parseIdParam } from '../utils/parseIdParam';

export async function postMessage(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const text = req.body.text as string;
    if (!text) return res.status(400).json({ message: 'Missing fields' });
    const volunteerId =
      req.user.role === 'volunteer'
        ? Number(req.user.id)
        : parseIdParam(req.body.volunteerId);
    if (!volunteerId) return res.status(400).json({ message: 'Missing fields' });
    if (req.user.role === 'volunteer' && volunteerId !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const msg = await createMessage(volunteerId, req.user.role, text);
    res.status(201).json(msg);
  } catch (err) {
    next(err);
  }
}

export async function getMessages(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const volunteerId =
      req.user.role === 'volunteer'
        ? Number(req.user.id)
        : parseIdParam(req.query.volunteerId as string);
    if (!volunteerId) return res.status(400).json({ message: 'Missing volunteerId' });
    if (req.user.role === 'volunteer' && volunteerId !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const msgs = await getMessagesForVolunteer(volunteerId);
    res.json(msgs);
  } catch (err) {
    next(err);
  }
}

import { Request, Response, NextFunction } from 'express';
import {
  getLeaveEmail,
  setLeaveEmail,
} from '../../utils/leaveEmailSettings';

export async function getLeaveEmailHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const email = await getLeaveEmail();
    res.json({ email });
  } catch (err) {
    next(err);
  }
}

export async function updateLeaveEmailHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { email } = req.body;
    await setLeaveEmail(email);
    res.json({ email });
  } catch (err) {
    next(err);
  }
}

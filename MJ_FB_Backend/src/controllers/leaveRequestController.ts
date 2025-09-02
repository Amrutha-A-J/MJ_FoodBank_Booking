import { Request, Response, NextFunction } from 'express';
import {
  listLeaveRequests,
  createLeaveRequest as modelCreate,
  approveLeaveRequest as modelApprove,
  rejectLeaveRequest as modelReject,
  cancelLeaveRequest as modelCancel,
} from '../models/leaveRequest';

export async function listRequests(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const staffId = req.user.role === 'admin' ? undefined : Number(req.user.id);
    const rows = await listLeaveRequests(staffId);
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

export async function createRequest(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const staffId = Number(req.user.id);
    const { startDate, endDate, reason } = req.body;
    const row = await modelCreate(staffId, startDate, endDate, reason);
    res.status(201).json(row);
  } catch (err) {
    next(err);
  }
}

export async function approveRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const row = await modelApprove(id);
    res.json(row);
  } catch (err) {
    next(err);
  }
}

export async function rejectRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const row = await modelReject(id);
    res.json(row);
  } catch (err) {
    next(err);
  }
}

export async function cancelRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    const row = await modelCancel(id);
    res.json(row);
  } catch (err) {
    next(err);
  }
}

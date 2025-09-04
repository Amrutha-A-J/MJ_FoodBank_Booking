import { Request, Response, NextFunction } from "express";
import {
  insertLeaveRequest,
  selectLeaveRequests,
  updateLeaveRequestStatus,
} from "../models/leaveRequest";

export async function createLeaveRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { startDate, endDate, type, reason } = req.body;
    const record = await insertLeaveRequest(
      Number(req.user!.id),
      startDate,
      endDate,
      type,
      reason,
    );
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
}

export async function listLeaveRequests(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rows = await selectLeaveRequests();
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

export async function approveLeaveRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const record = await updateLeaveRequestStatus(
      Number(req.params.id),
      "approved",
    );
    res.json(record);
  } catch (err) {
    next(err);
  }
}

export async function rejectLeaveRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const record = await updateLeaveRequestStatus(
      Number(req.params.id),
      "rejected",
    );
    res.json(record);
  } catch (err) {
    next(err);
  }
}

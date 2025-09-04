import { Request, Response, NextFunction } from "express";
import {
  insertLeaveRequest,
  selectLeaveRequests,
  updateLeaveRequestStatus,
} from "../models/leaveRequest";
import { insertLeaveTimesheetDay } from "../models/timesheet";

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
    if (record.type !== "personal") {
      const start = new Date(record.start_date);
      const end = new Date(record.end_date);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        await insertLeaveTimesheetDay(
          record.staff_id,
          d.toISOString().slice(0, 10),
          record.type,
        );
      }
    }
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

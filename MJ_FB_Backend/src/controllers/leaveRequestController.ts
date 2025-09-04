import { Request, Response, NextFunction } from "express";
import {
  insertLeaveRequest,
  selectLeaveRequests,
  updateLeaveRequestStatus,
} from "../models/leaveRequest";
import seedTimesheets from "../utils/timesheetSeeder";
import { insertEvent } from "../models/event";
import { insertTimesheetLeaveDay } from "../models/timesheet";

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
    await seedTimesheets(record.staff_id);
    if (record.type !== "personal") {
      const start = new Date(record.start_date);
      const end = new Date(record.end_date);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split("T")[0];
        await insertTimesheetLeaveDay(record.staff_id, dateStr, record.type);
      }
    }
    await insertEvent({
      title: "Staff Leave",
      category: "staff_leave",
      startDate: record.start_date,
      endDate: record.end_date,
      createdBy: record.staff_id,
      visibleToClients: true,
      visibleToVolunteers: true,
    });
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

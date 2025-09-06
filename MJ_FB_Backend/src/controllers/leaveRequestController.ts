import { Request, Response, NextFunction } from "express";
import {
  insertLeaveRequest,
  selectLeaveRequests,
  selectLeaveRequestsByStaffId,
  updateLeaveRequestStatus,
  countApprovedPersonalDaysThisQuarter,
  LeaveType,
} from "../models/leaveRequest";
import { ensureTimesheetDay } from "../models/timesheet";
import { insertEvent } from "../models/event";
import { parseIdParam } from "../utils/parseIdParam";

export async function createLeaveRequest(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { startDate, endDate, type, reason } = req.body;
    if (type === LeaveType.Personal) {
      const count = await countApprovedPersonalDaysThisQuarter(
        Number(req.user!.id),
      );
      if (count >= 1) {
        return void res
          .status(400)
          .json({ message: "Only one personal day per quarter is allowed" });
      }
    }
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

export async function listLeaveRequestsByStaff(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const staffId = parseIdParam(req.params.staffId);
    if (staffId === null) {
      return void res.status(400).json({ message: "Invalid staff ID" });
    }
    const rows = await selectLeaveRequestsByStaffId(staffId);
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
    const id = parseIdParam(req.params.id);
    if (id === null) {
      return void res.status(400).json({ message: "Invalid ID" });
    }
    const record = await updateLeaveRequestStatus(id, "approved");
    if (record.type !== LeaveType.Personal) {
      const start = new Date(record.start_date);
      const end = new Date(record.end_date);
      for (
        let d = new Date(start);
        d <= end;
        d.setDate(d.getDate() + 1)
      ) {
        await ensureTimesheetDay(
          record.staff_id,
          d.toISOString().slice(0, 10),
        );
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
    const id = parseIdParam(req.params.id);
    if (id === null) {
      return void res.status(400).json({ message: "Invalid ID" });
    }
    const record = await updateLeaveRequestStatus(id, "rejected");
    res.json(record);
  } catch (err) {
    next(err);
  }
}

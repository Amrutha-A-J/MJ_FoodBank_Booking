import { Request, Response, NextFunction } from "express";
import {
  insertLeaveRequest,
  selectLeaveRequests,
  updateLeaveRequestStatus,
  countApprovedPersonalDaysThisQuarter,
  LeaveType,
} from "../models/leaveRequest";
import seedTimesheets from "../utils/timesheetSeeder";
import { insertEvent } from "../models/event";

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
    if (record.type !== LeaveType.Personal) {
      await seedTimesheets(record.staff_id);
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

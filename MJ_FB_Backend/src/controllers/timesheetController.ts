import { Request, Response, NextFunction } from 'express';
import {
  getTimesheetsForVolunteer,
  getTimesheetDays as modelGetTimesheetDays,
  getTimesheetById,
  updateTimesheetDay as modelUpdateTimesheetDay,
  submitTimesheet as modelSubmitTimesheet,
  rejectTimesheet as modelRejectTimesheet,
  processTimesheet as modelProcessTimesheet,
} from '../models/timesheet';

export async function listMyTimesheets(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const rows = await getTimesheetsForVolunteer(Number(req.user.id));
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

export async function getTimesheetDays(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const timesheetId = Number(req.params.id);
    const ts = await getTimesheetById(timesheetId);
    if (!ts || ts.volunteer_id !== Number(req.user.id)) {
      return next({
        status: 404,
        code: 'TIMESHEET_NOT_FOUND',
        message: 'Timesheet not found',
      });
    }
    const days = await modelGetTimesheetDays(timesheetId);
    res.json(days);
  } catch (err) {
    next(err);
  }
}

export async function updateTimesheetDay(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const timesheetId = Number(req.params.id);
    const workDate = req.params.date;
    const hours = Number(req.body.hours);
    const ts = await getTimesheetById(timesheetId);
    if (!ts || ts.volunteer_id !== Number(req.user.id)) {
      return next({
        status: 404,
        code: 'TIMESHEET_NOT_FOUND',
        message: 'Timesheet not found',
      });
    }
    await modelUpdateTimesheetDay(timesheetId, workDate, hours);
    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
}

export async function submitTimesheet(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const timesheetId = Number(req.params.id);
    const ts = await getTimesheetById(timesheetId);
    if (!ts || ts.volunteer_id !== Number(req.user.id)) {
      return next({
        status: 404,
        code: 'TIMESHEET_NOT_FOUND',
        message: 'Timesheet not found',
      });
    }
    await modelSubmitTimesheet(timesheetId);
    res.json({ message: 'Submitted' });
  } catch (err) {
    next(err);
  }
}

export async function rejectTimesheet(req: Request, res: Response, next: NextFunction) {
  try {
    const timesheetId = Number(req.params.id);
    await modelRejectTimesheet(timesheetId);
    res.json({ message: 'Rejected' });
  } catch (err) {
    next(err);
  }
}

export async function processTimesheet(req: Request, res: Response, next: NextFunction) {
  try {
    const timesheetId = Number(req.params.id);
    await modelProcessTimesheet(timesheetId);
    res.json({ message: 'Processed' });
  } catch (err) {
    next(err);
  }
}


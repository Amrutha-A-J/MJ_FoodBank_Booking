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
import pool from '../db';

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
    const {
      regHours = 0,
      otHours = 0,
      statHours = 0,
      sickHours = 0,
      vacHours = 0,
      note = undefined,
    } = req.body;
    const ts = await getTimesheetById(timesheetId);
    if (!ts || ts.volunteer_id !== Number(req.user.id)) {
      return next({
        status: 404,
        code: 'TIMESHEET_NOT_FOUND',
        message: 'Timesheet not found',
      });
    }
    await modelUpdateTimesheetDay(timesheetId, workDate, {
      regHours: Number(regHours),
      otHours: Number(otHours),
      statHours: Number(statHours),
      sickHours: Number(sickHours),
      vacHours: Number(vacHours),
      note,
    });
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
    try {
      await pool.query('SELECT validate_timesheet_balance($1)', [timesheetId]);
    } catch (err: any) {
      return next({ status: 400, code: 'VALIDATION_ERROR', message: err.message });
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


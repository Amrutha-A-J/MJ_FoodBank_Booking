import { Request, Response, NextFunction } from 'express';
import {
  getTimesheetsForStaff,
  getTimesheets,
  getTimesheetDays as modelGetTimesheetDays,
  getTimesheetById,
  updateTimesheetDay as modelUpdateTimesheetDay,
  submitTimesheet as modelSubmitTimesheet,
  rejectTimesheet as modelRejectTimesheet,
  processTimesheet as modelProcessTimesheet,
} from '../models/timesheet';
import pool from '../db';
import { parseIdParam } from '../utils/parseIdParam';

export async function listMyTimesheets(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user || req.user.type !== 'staff')
      return res.status(401).json({ message: 'Unauthorized' });
    const rows = await getTimesheetsForStaff(Number(req.user.id));
    res.json(rows);
  } catch (err) {
    return next(err);
  }
}

export async function listTimesheets(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user || req.user.type !== 'staff')
      return res.status(401).json({ message: 'Unauthorized' });
    const parseQueryInteger = (value: unknown) => {
      if (value === undefined) return { defined: false, value: undefined };
      if (Array.isArray(value)) return { defined: true, value: null };
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
        return { defined: true, value: null };
      }
      return { defined: true, value: parsed };
    };

    const staffIdParsed = parseQueryInteger(req.query.staffId);
    const yearParsed = parseQueryInteger(req.query.year);
    const monthParsed = parseQueryInteger(req.query.month);

    if (
      staffIdParsed.value === null ||
      yearParsed.value === null ||
      monthParsed.value === null
    ) {
      return res.status(400).json({ message: 'Invalid query parameters' });
    }

    const staffId = staffIdParsed.value;
    const year = yearParsed.value;
    const month = monthParsed.value;
    const rows = await getTimesheets(staffId, year, month);
    res.json(rows);
  } catch (err) {
    return next(err);
  }
}

export async function getTimesheetDays(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user || req.user.type !== 'staff')
      return res.status(401).json({ message: 'Unauthorized' });
    const timesheetId = parseIdParam(req.params.id);
    if (timesheetId === null) {
      return res.status(400).json({ message: 'Invalid ID' });
    }
    const ts = await getTimesheetById(timesheetId);
    if (!ts || (ts.staff_id !== Number(req.user.id) && req.user.role !== 'admin')) {
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
    if (!req.user || req.user.type !== 'staff')
      return res.status(401).json({ message: 'Unauthorized' });
    const timesheetId = parseIdParam(req.params.id);
    if (timesheetId === null) {
      return res.status(400).json({ message: 'Invalid ID' });
    }
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
    if (!ts || ts.staff_id !== Number(req.user.id)) {
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
    return next(err);
  }
}

export async function submitTimesheet(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user || req.user.type !== 'staff')
      return res.status(401).json({ message: 'Unauthorized' });
    const timesheetId = parseIdParam(req.params.id);
    if (timesheetId === null) {
      return res.status(400).json({ message: 'Invalid ID' });
    }
    const ts = await getTimesheetById(timesheetId);
    if (!ts || ts.staff_id !== Number(req.user.id)) {
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
    const timesheetId = parseIdParam(req.params.id);
    if (timesheetId === null) {
      return res.status(400).json({ message: 'Invalid ID' });
    }
    await modelRejectTimesheet(timesheetId);
    res.json({ message: 'Rejected' });
  } catch (err) {
    next(err);
  }
}

export async function processTimesheet(req: Request, res: Response, next: NextFunction) {
  try {
    const timesheetId = parseIdParam(req.params.id);
    if (timesheetId === null) {
      return res.status(400).json({ message: 'Invalid ID' });
    }
    await modelProcessTimesheet(timesheetId);
    res.json({ message: 'Processed' });
  } catch (err) {
    next(err);
  }
}


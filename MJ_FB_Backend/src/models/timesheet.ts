import pool from '../db';

export interface Timesheet {
  id: number;
  volunteer_id: number;
  start_date: string;
  end_date: string;
  submitted_at: string | null;
  approved_at: string | null;
}

export interface TimesheetDay {
  id: number;
  timesheet_id: number;
  work_date: string;
  expected_hours: number;
  actual_hours: number;
}

export interface TimesheetSummary extends Timesheet {
  total_hours: number;
  expected_hours: number;
  balance_hours: number;
}

export async function getTimesheetsForVolunteer(volunteerId: number): Promise<TimesheetSummary[]> {
  const res = await pool.query(
    `SELECT t.id, t.volunteer_id, t.start_date, t.end_date, t.submitted_at, t.approved_at,
            COALESCE(tot.total_hours, 0) AS total_hours,
            COALESCE(exp.expected_hours, 0) AS expected_hours,
            COALESCE(bal.balance_hours, 0) AS balance_hours
       FROM timesheets t
       LEFT JOIN v_timesheet_totals tot ON tot.timesheet_id = t.id
       LEFT JOIN v_timesheet_expected exp ON exp.timesheet_id = t.id
       LEFT JOIN v_timesheet_balance bal ON bal.timesheet_id = t.id
      WHERE t.volunteer_id = $1
      ORDER BY t.start_date DESC`,
    [volunteerId],
  );
  return res.rows;
}

export async function getTimesheetById(id: number): Promise<Timesheet | undefined> {
  const res = await pool.query('SELECT * FROM timesheets WHERE id = $1', [id]);
  return res.rows[0];
}

export async function getTimesheetDays(timesheetId: number): Promise<TimesheetDay[]> {
  const res = await pool.query(
    'SELECT id, timesheet_id, work_date, expected_hours, actual_hours FROM timesheet_days WHERE timesheet_id = $1 ORDER BY work_date',
    [timesheetId],
  );
  return res.rows;
}

export async function updateTimesheetDay(
  timesheetId: number,
  workDate: string,
  hours: number,
): Promise<void> {
  const tsRes = await pool.query(
    'SELECT submitted_at, approved_at FROM timesheets WHERE id = $1',
    [timesheetId],
  );
  if ((tsRes.rowCount ?? 0) === 0) {
    const err: any = new Error('Timesheet not found');
    err.status = 404;
    err.code = 'TIMESHEET_NOT_FOUND';
    throw err;
  }
  const { submitted_at, approved_at } = tsRes.rows[0];
  if (submitted_at || approved_at) {
    const err: any = new Error('Timesheet is locked');
    err.status = 400;
    err.code = 'TIMESHEET_LOCKED';
    throw err;
  }
  const res = await pool.query(
    'UPDATE timesheet_days SET actual_hours = $3 WHERE timesheet_id = $1 AND work_date = $2 RETURNING id',
    [timesheetId, workDate, hours],
  );
  if ((res.rowCount ?? 0) === 0) {
    const err: any = new Error('Day not found');
    err.status = 404;
    err.code = 'DAY_NOT_FOUND';
    throw err;
  }
}

export async function submitTimesheet(id: number): Promise<void> {
  try {
    await pool.query('SELECT validate_timesheet_balance($1)', [id]);
  } catch (e) {
    const err: any = new Error('Timesheet must balance');
    err.status = 400;
    err.code = 'TIMESHEET_UNBALANCED';
    throw err;
  }
  const res = await pool.query(
    'UPDATE timesheets SET submitted_at = NOW() WHERE id = $1 AND submitted_at IS NULL RETURNING id',
    [id],
  );
  if ((res.rowCount ?? 0) === 0) {
    const err: any = new Error('Timesheet already submitted');
    err.status = 400;
    err.code = 'ALREADY_SUBMITTED';
    throw err;
  }
}

export async function rejectTimesheet(id: number): Promise<void> {
  const res = await pool.query(
    'UPDATE timesheets SET submitted_at = NULL WHERE id = $1 AND approved_at IS NULL RETURNING id',
    [id],
  );
  if ((res.rowCount ?? 0) === 0) {
    const err: any = new Error('Timesheet already processed');
    err.status = 400;
    err.code = 'ALREADY_PROCESSED';
    throw err;
  }
}

export async function processTimesheet(id: number): Promise<void> {
  try {
    await pool.query('SELECT validate_timesheet_balance($1)', [id]);
  } catch (e) {
    const err: any = new Error('Timesheet must balance');
    err.status = 400;
    err.code = 'TIMESHEET_UNBALANCED';
    throw err;
  }
  const res = await pool.query(
    'UPDATE timesheets SET approved_at = NOW() WHERE id = $1 AND submitted_at IS NOT NULL AND approved_at IS NULL RETURNING id',
    [id],
  );
  if ((res.rowCount ?? 0) === 0) {
    const err: any = new Error('Timesheet not submitted');
    err.status = 400;
    err.code = 'NOT_SUBMITTED';
    throw err;
  }
}


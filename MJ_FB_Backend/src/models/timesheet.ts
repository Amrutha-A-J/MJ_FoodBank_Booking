import pool from '../db';

export interface Timesheet {
  id: number;
  staff_id: number;
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
  reg_hours: number;
  ot_hours: number;
  stat_hours: number;
  sick_hours: number;
  vac_hours: number;
  note: string | null;
  locked_by_rule: boolean;
  locked_by_leave: boolean;
}

export interface TimesheetSummary extends Timesheet {
  total_hours: number;
  expected_hours: number;
  balance_hours: number;
  ot_hours: number;
}

export async function getTimesheets(
  staffId?: number,
): Promise<TimesheetSummary[]> {
  const params: any[] = [];
  let where = '';
  if (staffId !== undefined) {
    params.push(staffId);
    where = 'WHERE t.staff_id = $1';
  }
  const res = await pool.query(
    `SELECT t.id, t.staff_id, t.start_date, t.end_date, t.submitted_at, t.approved_at,
            COALESCE(tot.total_hours, 0) AS total_hours,
            COALESCE(exp.expected_hours, 0) AS expected_hours,
            COALESCE(bal.balance_hours, 0) AS balance_hours,
            COALESCE(bal.ot_hours, 0) AS ot_hours
       FROM timesheets t
       LEFT JOIN v_timesheet_totals tot ON tot.timesheet_id = t.id
       LEFT JOIN v_timesheet_expected exp ON exp.timesheet_id = t.id
       LEFT JOIN v_timesheet_balance bal ON bal.timesheet_id = t.id
      ${where}
      ORDER BY t.start_date DESC`,
    params,
  );
  return res.rows;
}

export async function getTimesheetsForStaff(
  staffId: number,
): Promise<TimesheetSummary[]> {
  return getTimesheets(staffId);
}

export async function getTimesheetSummary(
  id: number,
): Promise<TimesheetSummary | undefined> {
  const res = await pool.query(
    `SELECT t.id, t.staff_id, t.start_date, t.end_date, t.submitted_at, t.approved_at,
            COALESCE(tot.total_hours, 0) AS total_hours,
            COALESCE(exp.expected_hours, 0) AS expected_hours,
            COALESCE(bal.balance_hours, 0) AS balance_hours,
            COALESCE(bal.ot_hours, 0) AS ot_hours
       FROM timesheets t
       LEFT JOIN v_timesheet_totals tot ON tot.timesheet_id = t.id
       LEFT JOIN v_timesheet_expected exp ON exp.timesheet_id = t.id
       LEFT JOIN v_timesheet_balance bal ON bal.timesheet_id = t.id
      WHERE t.id = $1`,
    [id],
  );
  return res.rows[0];
}

export async function getTimesheetById(id: number): Promise<Timesheet | undefined> {
  const res = await pool.query('SELECT * FROM timesheets WHERE id = $1', [id]);
  return res.rows[0];
}

export async function getTimesheetDays(timesheetId: number): Promise<TimesheetDay[]> {
  const res = await pool.query(
    `SELECT id, timesheet_id, work_date, expected_hours, reg_hours, ot_hours, stat_hours,
            sick_hours, vac_hours, note, locked_by_rule, locked_by_leave
       FROM timesheet_days
      WHERE timesheet_id = $1
      ORDER BY work_date`,
    [timesheetId],
  );
  return res.rows;
}

export async function insertLeaveTimesheetDay(
  staffId: number,
  workDate: string,
  type: string,
): Promise<void> {
  const vacHours = type === 'vacation' ? 8 : 0;
  const sickHours = type === 'sick' ? 8 : 0;
  await pool.query(
    `INSERT INTO timesheet_days (
        timesheet_id,
        work_date,
        expected_hours,
        reg_hours,
        ot_hours,
        stat_hours,
        sick_hours,
        vac_hours,
        note,
        locked_by_rule,
        locked_by_leave
     )
     SELECT t.id, $2, 8, 0, 0, 0, $3, $4, NULL, false, false
       FROM timesheets t
      WHERE t.staff_id = $1 AND $2::date BETWEEN t.start_date AND t.end_date
     ON CONFLICT (timesheet_id, work_date) DO UPDATE SET
       expected_hours = EXCLUDED.expected_hours,
       reg_hours = EXCLUDED.reg_hours,
       ot_hours = EXCLUDED.ot_hours,
       stat_hours = EXCLUDED.stat_hours,
       sick_hours = EXCLUDED.sick_hours,
       vac_hours = EXCLUDED.vac_hours,
       note = EXCLUDED.note,
       locked_by_rule = false,
       locked_by_leave = false`,
    [staffId, workDate, sickHours, vacHours],
  );
}

export interface TimesheetDayUpdate {
  regHours: number;
  otHours: number;
  statHours: number;
  sickHours: number;
  vacHours: number;
  note?: string;
}

export async function updateTimesheetDay(
  timesheetId: number,
  workDate: string,
  data: TimesheetDayUpdate,
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
    `UPDATE timesheet_days
        SET reg_hours = $3,
            ot_hours = $4,
            stat_hours = $5,
            sick_hours = $6,
            vac_hours = $7,
            note = $8
      WHERE timesheet_id = $1 AND work_date = $2
      RETURNING id`,
    [
      timesheetId,
      workDate,
      data.regHours,
      data.otHours,
      data.statHours,
      data.sickHours,
      data.vacHours,
      data.note ?? null,
    ],
  );
  if ((res.rowCount ?? 0) === 0) {
    const err: any = new Error('Day not found');
    err.status = 404;
    err.code = 'DAY_NOT_FOUND';
    throw err;
  }
}

export async function submitTimesheet(id: number): Promise<void> {
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


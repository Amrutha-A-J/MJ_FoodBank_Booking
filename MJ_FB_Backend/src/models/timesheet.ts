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
  year?: number,
  month?: number,
): Promise<TimesheetSummary[]> {
  const params: any[] = [];
  const clauses: string[] = [];
  if (staffId !== undefined) {
    params.push(staffId);
    clauses.push(`t.staff_id = $${params.length}`);
  }
  if (month !== undefined) {
    const yr = year ?? new Date().getFullYear();
    params.push(`${yr}-${String(month).padStart(2, '0')}-01`);
    const idx = params.length;
    clauses.push(
      `t.start_date <= ($${idx}::date + INTERVAL '1 month' - INTERVAL '1 day') AND t.end_date >= $${idx}`,
    );
  } else if (year !== undefined) {
    params.push(year);
    clauses.push(
      `(EXTRACT(YEAR FROM t.start_date) = $${params.length} OR EXTRACT(YEAR FROM t.end_date) = $${params.length})`,
    );
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
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
  year?: number,
  month?: number,
): Promise<TimesheetSummary[]> {
  return getTimesheets(staffId, year, month);
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

export async function ensureTimesheetDay(
  staffId: number,
  workDate: string,
): Promise<void> {
  const periodRes = await pool.query(
    'SELECT start_date, end_date FROM pay_periods WHERE $1 BETWEEN start_date AND end_date',
    [workDate],
  );
  if (periodRes.rowCount === 0) {
    return;
  }
  const { start_date, end_date } = periodRes.rows[0];

  let timesheetId: number;
  const tsRes = await pool.query(
    'SELECT id FROM timesheets WHERE staff_id = $1 AND start_date = $2 AND end_date = $3',
    [staffId, start_date, end_date],
  );
  if (tsRes.rowCount && tsRes.rowCount > 0) {
    timesheetId = tsRes.rows[0].id;
  } else {
    const insertRes = await pool.query(
      'INSERT INTO timesheets (staff_id, start_date, end_date) VALUES ($1, $2, $3) RETURNING id',
      [staffId, start_date, end_date],
    );
    timesheetId = insertRes.rows[0].id;
  }

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
        note
     )
     VALUES ($1, $2, 0, 0, 0, 0, 0, 0, NULL)
     ON CONFLICT (timesheet_id, work_date) DO NOTHING`,
    [timesheetId, workDate],
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


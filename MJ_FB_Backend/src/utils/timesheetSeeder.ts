import pool from '../db';
import logger from './logger';

/**
 * Seed timesheets for staff in the current and next four pay periods. When the
 * `staff` table includes an `active` column, only active staff are processed;
 * otherwise all staff are seeded. For each staff member, ensure a timesheet
 * exists for each period and insert weekday rows with zeroed hours. Stat
 * holiday rows are handled via database triggers.
 *
 * @param staffId Optional staff ID to seed for a specific staff member. If
 * omitted, seeds for all staff (or only active staff when supported).
 */
export async function seedTimesheets(staffId?: number): Promise<void> {
  try {
    // Ensure the pay_periods table exists before querying it
    const tableCheck = await pool.query(
      "SELECT to_regclass('public.pay_periods') as table",
    );
    if (!tableCheck.rows[0] || !tableCheck.rows[0].table) {
      logger.warn('Skipping timesheet seeding: pay_periods table not found');
      return;
    }

    // Determine current pay period
    const payPeriodRes = await pool.query(
      `SELECT id, start_date, end_date FROM pay_periods WHERE CURRENT_DATE BETWEEN start_date AND end_date`,
    );

    if (payPeriodRes.rowCount === 0) {
      return; // No current pay period
    }

    const currentPeriod = payPeriodRes.rows[0];

    // Fetch current and next four pay periods
    const periodsRes = await pool.query(
      `SELECT id, start_date, end_date FROM pay_periods WHERE start_date >= $1 ORDER BY start_date ASC LIMIT 5`,
      [currentPeriod.start_date],
    );
    const periods = periodsRes.rows;

    // Check if the staff table has starts_on and active columns to avoid errors on older schemas
    const colCheck = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'staff' AND column_name IN ('starts_on', 'active')`,
    );
    const columns = colCheck.rows.map((r) => r.column_name);
    const hasStartsOn = columns.includes('starts_on');
    const hasActive = columns.includes('active');

    // Build staff query based on available columns
    const selectCols = `id${hasStartsOn ? ', starts_on' : ''}`;
    let staffSql = `SELECT ${selectCols} FROM staff`;
    const staffParams: any[] = [];
    if (staffId) {
      staffSql += hasActive ? ' WHERE active = true AND id = $1' : ' WHERE id = $1';
      staffParams.push(staffId);
    } else if (hasActive) {
      staffSql += ' WHERE active = true';
    }
    const staffRes = await pool.query(staffSql, staffParams);

    for (const staff of staffRes.rows) {
      for (const period of periods) {
        // Check for existing timesheet
        const tsRes = await pool.query(
          'SELECT id FROM timesheets WHERE staff_id = $1 AND start_date = $2 AND end_date = $3',
          [staff.id, period.start_date, period.end_date],
        );

        let timesheetId: number;
        if (tsRes.rowCount && tsRes.rowCount > 0) {
          timesheetId = tsRes.rows[0].id;
        } else {
          const insertRes = await pool.query(
            'INSERT INTO timesheets (staff_id, start_date, end_date) VALUES ($1, $2, $3) RETURNING id',
            [staff.id, period.start_date, period.end_date],
          );
          timesheetId = insertRes.rows[0].id;
        }

        // Insert weekday rows with zeroed hours
        const seriesStart = hasStartsOn ? 'GREATEST($2::date, $3::date)' : '$2::date';
        const params = hasStartsOn
          ? [timesheetId, period.start_date, staff.starts_on, period.end_date]
          : [timesheetId, period.start_date, period.end_date];

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
           SELECT $1, gs.day, 0, 0, 0, 0, 0, 0, NULL
             FROM generate_series(${seriesStart}, $${hasStartsOn ? 4 : 3}::date, '1 day') AS gs(day)
            WHERE EXTRACT(ISODOW FROM gs.day) < 6
            ON CONFLICT (timesheet_id, work_date) DO NOTHING`,
          params,
        );
      }
    }
  } catch (err) {
    logger.error('Error seeding timesheets:', err);
  }
}

export default seedTimesheets;

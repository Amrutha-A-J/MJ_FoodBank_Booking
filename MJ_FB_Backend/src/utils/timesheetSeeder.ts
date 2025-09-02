import pool from '../db';
import logger from './logger';

/**
 * Seed timesheets for active staff in the current pay period. For each active staff member,
 * ensure a timesheet exists for the current pay period and insert weekday rows with zeroed
 * hours. Stat holiday rows are handled via database triggers.
 *
 * @param staffId Optional staff ID to seed for a specific staff member. If omitted, seeds for all active staff.
 */
export async function seedTimesheets(staffId?: number): Promise<void> {
  try {
    // Determine current pay period
    const payPeriodRes = await pool.query(
      `SELECT id, start_date, end_date FROM pay_periods WHERE CURRENT_DATE BETWEEN start_date AND end_date`,
    );

    if (payPeriodRes.rowCount === 0) {
      return; // No current pay period
    }

    const period = payPeriodRes.rows[0];

    // Fetch active staff
    const staffRes = staffId
      ? await pool.query('SELECT id, starts_on FROM staff WHERE active = true AND id = $1', [staffId])
      : await pool.query('SELECT id, starts_on FROM staff WHERE active = true');

    for (const staff of staffRes.rows) {
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
      await pool.query(
        `INSERT INTO timesheet_days (timesheet_id, work_date, expected_hours, actual_hours)
         SELECT $1, gs.day, 0, 0
           FROM generate_series(GREATEST($2::date, $3::date), $4::date, '1 day') AS gs(day)
          WHERE EXTRACT(ISODOW FROM gs.day) < 6
          ON CONFLICT (timesheet_id, work_date) DO NOTHING`,
        [timesheetId, period.start_date, staff.starts_on, period.end_date],
      );
    }
  } catch (err) {
    logger.error('Error seeding timesheets:', err);
  }
}

export default seedTimesheets;

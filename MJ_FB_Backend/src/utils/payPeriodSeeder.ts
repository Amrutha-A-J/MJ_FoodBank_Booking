import pool from '../db';
import logger from './logger';

/**
 * Seed 14-day pay periods between the provided start and end dates.
 * Dates should be provided in YYYY-MM-DD format.
 */
export async function seedPayPeriods(start: string, end: string): Promise<void> {
  try {
    let current = new Date(start);
    const endDate = new Date(end);

    while (current <= endDate) {
      const periodStart = current.toISOString().slice(0, 10);
      const periodEndDate = new Date(current);
      periodEndDate.setDate(periodEndDate.getDate() + 13);
      const periodEnd = periodEndDate.toISOString().slice(0, 10);

      await pool.query(
        'INSERT INTO pay_periods (start_date, end_date) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [periodStart, periodEnd],
      );

      current.setDate(current.getDate() + 14);
    }
  } catch (err) {
    logger.error('Error seeding pay periods:', err);
  }
}

export default seedPayPeriods;

import pool from '../db';
import logger from './logger';

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export async function seedPayPeriods(year: number): Promise<void> {
  try {
    let start = new Date(year, 0, 1);
    while (start.getFullYear() === year) {
      const end = new Date(start);
      end.setDate(end.getDate() + 13);
      await pool.query(
        'INSERT INTO pay_periods (start_date, end_date) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [formatDate(start), formatDate(end)],
      );
      start.setDate(start.getDate() + 14);
    }
  } catch (err) {
    logger.error('Error seeding pay periods:', err);
  }
}

export default seedPayPeriods;

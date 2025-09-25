import pool from '../db';
import logger from './logger';
import scheduleDailyJob from './scheduleDailyJob';

const createDailyJob = scheduleDailyJob.createDailyJob ?? scheduleDailyJob;

export const RETENTION_YEARS = 1;

export function getRetentionCutoffDate(reference: Date = new Date()): Date {
  const cutoff = new Date(reference);
  cutoff.setFullYear(cutoff.getFullYear() - RETENTION_YEARS);
  return cutoff;
}

export async function cleanupOldRecords(referenceDate: Date = new Date()): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const cutoff = getRetentionCutoffDate(referenceDate);

    await client.query(
      `UPDATE volunteers v
       SET archived_hours = archived_hours + s.completed_hours,
           archived_shifts = archived_shifts + s.completed_shifts,
           archived_bookings = archived_bookings + s.total_bookings,
           archived_no_shows = archived_no_shows + s.no_shows,
           has_early_bird = has_early_bird OR s.early_bird
       FROM (
         SELECT vb.volunteer_id,
                COALESCE(SUM(CASE WHEN vb.status='completed' THEN EXTRACT(EPOCH FROM (vs.end_time - vs.start_time)) / 3600 ELSE 0 END),0) AS completed_hours,
                COUNT(*) FILTER (WHERE vb.status='completed') AS completed_shifts,
                COUNT(*) FILTER (WHERE vb.status IN ('approved','completed','no_show')) AS total_bookings,
                COUNT(*) FILTER (WHERE vb.status='no_show') AS no_shows,
                BOOL_OR(vs.start_time < '09:00:00' AND vb.status='completed') AS early_bird
         FROM volunteer_bookings vb
         JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
         WHERE vb.date < $1
         GROUP BY vb.volunteer_id
       ) s
       WHERE v.id = s.volunteer_id`,
      [cutoff],
    );

    await client.query('DELETE FROM volunteer_bookings WHERE date < $1', [cutoff]);
    await client.query('DELETE FROM bookings WHERE date < $1', [cutoff]);

    await client.query('COMMIT');

    for (const table of ['volunteer_bookings', 'bookings']) {
      try {
        await client.query(`VACUUM (ANALYZE) ${table}`);
      } catch (vacuumErr) {
        logger.error(`Failed to VACUUM ANALYZE ${table}`, vacuumErr);
      }
    }

    logger.info('Old bookings cleaned up');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Failed to clean up old bookings', err);
  } finally {
    client.release();
  }
}

const retentionJob = createDailyJob(cleanupOldRecords, '0 3 * * *', true, true);

export const startRetentionJob = retentionJob.start;
export const stopRetentionJob = retentionJob.stop;

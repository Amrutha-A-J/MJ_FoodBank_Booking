import { Request, Response, NextFunction } from 'express';
import pool from '../../db';
import logger from '../../logger';

export async function getGroupVolunteerStats(_req: Request, res: Response, next: NextFunction) {
  try {
    const statsRes = await pool.query(
      `SELECT
         vh.total_hours,
         wh.total_lbs,
         mh.month_hours,
         mw.month_lbs,
         wk.week_lbs
       FROM
         (SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (vs.end_time - vs.start_time)) / 3600),0) AS total_hours
          FROM volunteer_bookings vb
          JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
          WHERE vb.status = 'approved') vh
       CROSS JOIN
         (SELECT COALESCE(SUM(cv.weight_without_cart),0) AS total_lbs FROM client_visits cv) wh
       CROSS JOIN
         (SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (vs.end_time - vs.start_time)) / 3600),0) AS month_hours
          FROM volunteer_bookings vb
          JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
          WHERE vb.status = 'approved'
            AND DATE_TRUNC('month', vb.date) = DATE_TRUNC('month', CURRENT_DATE)) mh
       CROSS JOIN
         (SELECT COALESCE(SUM(cv.weight_without_cart),0) AS month_lbs
          FROM client_visits cv
          WHERE DATE_TRUNC('month', cv.date) = DATE_TRUNC('month', CURRENT_DATE)) mw
       CROSS JOIN
         (SELECT COALESCE(SUM(cv.weight_without_cart),0) AS week_lbs
          FROM client_visits cv
          WHERE DATE_TRUNC('week', cv.date) = DATE_TRUNC('week', CURRENT_DATE)) wk`);
    const goalRes = await pool.query(
      `SELECT value::int AS goal FROM app_config WHERE key = 'volunteer_monthly_hours_goal'`
    );
    const row = statsRes.rows[0] || {};
    const goal = goalRes.rows[0]?.goal ?? 0;
    res.json({
      totalHours: Number(row.total_hours ?? 0),
      totalLbs: Number(row.total_lbs ?? 0),
      currentMonth: {
        hours: Number(row.month_hours ?? 0),
        lbs: Number(row.month_lbs ?? 0),
        goalHours: goal,
      },
      currentWeekLbs: Number(row.week_lbs ?? 0),
    });
  } catch (error) {
    logger.error('Error fetching group volunteer stats:', error);
    next(error);
  }
}

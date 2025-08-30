import { Request, Response, NextFunction } from 'express';
import pool from '../../db';
import logger from '../../utils/logger';

export async function getVolunteerLeaderboard(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const user = req.user;
  if (!user) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const result = await pool.query(
      `WITH volunteer_counts AS (
         SELECT v.id,
                COALESCE(COUNT(vb.*), 0) AS total
         FROM volunteers v
         LEFT JOIN volunteer_bookings vb
           ON vb.volunteer_id = v.id AND vb.status = 'completed'
         GROUP BY v.id
       ),
       ranked AS (
         SELECT id,
                DENSE_RANK() OVER (ORDER BY total DESC) AS rank,
                COUNT(*) OVER () AS total_volunteers
         FROM volunteer_counts
       )
       SELECT rank,
              ROUND((1 - (rank - 1)::numeric / total_volunteers::numeric) * 100, 2) AS percentile
       FROM ranked
       WHERE id = $1`,
      [user.id],
    );
    const row = result.rows[0];
    if (!row) return res.json({ rank: null, percentile: null });
    res.json({ rank: Number(row.rank), percentile: Number(row.percentile) });
  } catch (error) {
    logger.error('Error fetching volunteer leaderboard:', error);
    next(error);
  }
}

export async function getVolunteerGroupStats(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await pool.query(
      `WITH hours AS (
         SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (vs.end_time - vs.start_time)) / 3600), 0) AS total_hours,
                COALESCE(SUM(
                  CASE
                    WHEN date_trunc('month', vb.date) = date_trunc('month', CURRENT_DATE)
                    THEN EXTRACT(EPOCH FROM (vs.end_time - vs.start_time)) / 3600
                    ELSE 0
                  END
                ), 0) AS month_hours
         FROM volunteer_bookings vb
         JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
         WHERE vb.status = 'completed'
       ),
       weight AS (
       SELECT COALESCE(SUM(weight_with_cart - weight_without_cart), 0) AS total_lbs,
              COALESCE(SUM(
                CASE
                  WHEN date_trunc('week', date) = date_trunc('week', CURRENT_DATE)
                  THEN weight_with_cart - weight_without_cart
                  ELSE 0
                END
               ), 0) AS week_lbs,
               COALESCE(SUM(
                 CASE
                   WHEN date_trunc('month', date) = date_trunc('month', CURRENT_DATE)
                   THEN weight_with_cart - weight_without_cart
                   ELSE 0
                 END
               ), 0) AS month_lbs,
               COALESCE(COUNT(DISTINCT CASE
                   WHEN date_trunc('month', date) = date_trunc('month', CURRENT_DATE)
                   THEN client_id
                 END), 0) AS month_families
        FROM client_visits
      ),
      goal AS (
        SELECT COALESCE(value::numeric, 0) AS month_goal
        FROM app_config
        WHERE key = 'volunteer_monthly_hours_goal'
      )
      SELECT total_hours,
             month_hours,
             month_goal,
             total_lbs,
             week_lbs,
             month_lbs,
             month_families
        FROM hours, weight, goal`,
    );
    const row = result.rows[0] ?? {};
    res.json({
      totalHours: Number(row.total_hours ?? 0),
      monthHours: Number(row.month_hours ?? 0),
      monthHoursGoal: Number(row.month_goal ?? 0),
      totalLbs: Number(row.total_lbs ?? 0),
      weekLbs: Number(row.week_lbs ?? 0),
      monthLbs: Number(row.month_lbs ?? 0),
      monthFamilies: Number(row.month_families ?? 0),
    });
  } catch (error) {
    logger.error('Error fetching volunteer group stats:', error);
    next(error);
  }
}

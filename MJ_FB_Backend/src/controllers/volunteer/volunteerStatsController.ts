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
                v.archived_shifts + COALESCE(COUNT(vb.*), 0) AS total
         FROM volunteers v
         LEFT JOIN volunteer_bookings vb
           ON vb.volunteer_id = v.id AND vb.status = 'completed'
         GROUP BY v.id, v.archived_shifts
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
      `WITH bounds AS (
         SELECT date_trunc('week', timezone('Canada/Saskatchewan', now()))::date AS week_start,
                (date_trunc('week', timezone('Canada/Saskatchewan', now()))::date + INTERVAL '7 days')::date AS week_end,
                date_trunc('month', timezone('Canada/Saskatchewan', now()))::date AS month_start,
                (date_trunc('month', timezone('Canada/Saskatchewan', now()))::date + INTERVAL '1 month')::date AS month_end
       ),
       booking_hours AS (
         SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (vs.end_time - vs.start_time)) / 3600), 0) AS total_hours,
                COALESCE(SUM(EXTRACT(EPOCH FROM (vs.end_time - vs.start_time)) / 3600)
                  FILTER (WHERE vb.date >= bounds.month_start AND vb.date < bounds.month_end), 0) AS month_hours
         FROM volunteer_bookings vb
         JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
         CROSS JOIN bounds
         WHERE vb.status = 'completed'
       ),
       archived AS (
         SELECT COALESCE(SUM(archived_hours),0) AS archived_hours FROM volunteers
       ),
       cart AS (
         SELECT COALESCE(value::numeric, 0) AS cart_tare
         FROM app_config
         WHERE key = 'cart_tare'
       ),
       weight AS (
         SELECT COALESCE(SUM(COALESCE(weight_without_cart, weight_with_cart - cart_tare)), 0) AS total_lbs,
                COALESCE(SUM(COALESCE(weight_without_cart, weight_with_cart - cart_tare))
                  FILTER (WHERE date >= bounds.week_start AND date < bounds.week_end), 0) AS week_lbs,
                COALESCE(SUM(COALESCE(weight_without_cart, weight_with_cart - cart_tare))
                  FILTER (WHERE date >= bounds.month_start AND date < bounds.month_end), 0) AS month_lbs,
                COALESCE(COUNT(DISTINCT client_id)
                  FILTER (WHERE date >= bounds.month_start AND date < bounds.month_end AND is_anonymous = false), 0) AS month_families
         FROM client_visits
         CROSS JOIN cart
         CROSS JOIN bounds
      ),
      goal AS (
        SELECT COALESCE(value::numeric, 0) AS month_goal
        FROM app_config
        WHERE key = 'volunteer_monthly_hours_goal'
      )
      SELECT archived.archived_hours + booking_hours.total_hours AS total_hours,
             booking_hours.month_hours,
             month_goal,
             total_lbs,
             week_lbs,
             month_lbs,
             month_families
        FROM booking_hours, archived, weight, goal`,
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

export async function getVolunteerRanking(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { roleId } = req.query;
  const filterRole = roleId ? Number(roleId) : null;
  try {
    const result = await pool.query(
      `SELECT v.id,
              v.first_name || ' ' || v.last_name AS name,
              v.archived_shifts + COUNT(*) AS total
         FROM volunteer_bookings vb
         JOIN volunteers v ON vb.volunteer_id = v.id
         JOIN volunteer_slots vs ON vb.slot_id = vs.slot_id
        WHERE vb.status = 'completed'
          AND ($1::int IS NULL OR vs.role_id = $1)
        GROUP BY v.id, name, v.archived_shifts
        ORDER BY total DESC
        LIMIT 10`,
      [filterRole],
    );
    const rows = result.rows.map(r => ({
      id: Number(r.id),
      name: r.name,
      total: Number(r.total),
    }));
    res.json(rows);
  } catch (error) {
    logger.error('Error fetching volunteer ranking:', error);
    next(error);
  }
}

export async function getVolunteerNoShowRanking(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await pool.query(
      `WITH stats AS (
         SELECT v.id,
                v.first_name || ' ' || v.last_name AS name,
                v.archived_bookings + COUNT(*) FILTER (WHERE vb.status IN ('approved','completed','no_show')) AS total_bookings,
                v.archived_no_shows + COUNT(*) FILTER (WHERE vb.status = 'no_show') AS no_shows
         FROM volunteers v
         LEFT JOIN volunteer_bookings vb ON vb.volunteer_id = v.id
         GROUP BY v.id, name, v.archived_bookings, v.archived_no_shows
       )
       SELECT id,
              name,
              total_bookings,
              no_shows,
              ROUND(no_shows::numeric / NULLIF(total_bookings,0), 2) AS no_show_rate
       FROM stats
       WHERE total_bookings >= 5 AND no_shows > 0
       ORDER BY no_show_rate DESC, no_shows DESC
       LIMIT 10`,
    );
    const rows = result.rows.map(r => ({
      id: Number(r.id),
      name: r.name,
      totalBookings: Number(r.total_bookings),
      noShows: Number(r.no_shows),
      noShowRate: Number(r.no_show_rate),
    }));
    res.json(rows);
  } catch (error) {
    logger.error('Error fetching volunteer no-show ranking:', error);
    next(error);
  }
}

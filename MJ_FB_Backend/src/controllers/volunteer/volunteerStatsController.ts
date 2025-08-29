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
      `WITH counts AS (
         SELECT v.id AS volunteer_id, COUNT(vb.id) AS cnt
         FROM volunteers v
         LEFT JOIN volunteer_bookings vb ON vb.volunteer_id = v.id AND vb.status = 'approved'
         GROUP BY v.id
       ), ranked AS (
         SELECT volunteer_id,
                RANK() OVER (ORDER BY cnt DESC) AS r,
                COUNT(*) OVER () AS total
         FROM counts
       )
       SELECT r AS rank,
              ROUND(r::float / total::float * 100) AS percentile
       FROM ranked
       WHERE volunteer_id = $1`,
      [user.id],
    );
    if (result.rowCount === 0) {
      return res.json({ rank: null, percentile: null });
    }
    res.json({
      rank: Number(result.rows[0].rank),
      percentile: Number(result.rows[0].percentile),
    });
  } catch (error) {
    logger.error('Error fetching volunteer leaderboard stats:', error);
    next(error);
  }
}


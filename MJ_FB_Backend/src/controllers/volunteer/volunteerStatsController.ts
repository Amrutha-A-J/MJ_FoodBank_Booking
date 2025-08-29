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
           ON vb.volunteer_id = v.id AND vb.status = 'approved'
         GROUP BY v.id
       ),
       ranked AS (
         SELECT id,
                DENSE_RANK() OVER (ORDER BY total DESC) AS rank,
                COUNT(*) OVER () AS total_volunteers
         FROM volunteer_counts
       )
       SELECT rank,
              ROUND((1.0 - (rank - 1)::float / total_volunteers) * 100, 2) AS percentile
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

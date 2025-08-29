import { Request, Response } from 'express';
import pool from '../../db';
import logger from '../../utils/logger';
import config from '../../config';

export async function getGroupVolunteerStats(_req: Request, res: Response) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const monthHoursResult = await pool.query(
      `SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600),0) AS hours
       FROM volunteer_bookings b
       JOIN volunteer_slots s ON s.id = b.slot_id
       WHERE b.status = 'visited' AND b.date BETWEEN $1 AND $2`,
      [
        startOfMonth.toISOString().slice(0, 10),
        endOfMonth.toISOString().slice(0, 10),
      ],
    );

    const weekLbsResult = await pool.query(
      `SELECT COALESCE(SUM(weight)::int,0) AS lbs
       FROM outgoing_donation_log
       WHERE date BETWEEN $1 AND $2`,
      [
        startOfWeek.toISOString().slice(0, 10),
        endOfWeek.toISOString().slice(0, 10),
      ],
    );

    res.json({
      week: { distributedLbs: weekLbsResult.rows[0].lbs },
      month: {
        volunteerHours: Number(monthHoursResult.rows[0].hours),
        goalHours: config.volunteerMonthlyHoursGoal,
      },
    });
  } catch (err) {
    logger.error('Error fetching volunteer stats:', err);
    res.status(500).json({ message: 'Failed to fetch volunteer stats' });
  }
}

import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import logger from '../utils/logger';
import { createEventSchema } from '../schemas/eventSchemas';

export async function listEvents(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await pool.query(
      `SELECT e.id, e.title, e.details, e.category, e.date, e.created_at, e.updated_at,
              COALESCE(json_agg(es.staff_id) FILTER (WHERE es.staff_id IS NOT NULL), '[]') AS staff_ids
       FROM events e
       LEFT JOIN event_staff es ON e.id = es.event_id
       GROUP BY e.id
       ORDER BY e.date ASC`
    );

    const today: any[] = [];
    const upcoming: any[] = [];
    const past: any[] = [];
    const todayStr = new Date().toISOString().split('T')[0];

    for (const row of result.rows) {
      const dateStr = row.date instanceof Date ? row.date.toISOString().split('T')[0] : row.date;
      if (dateStr === todayStr) {
        today.push(row);
      } else if (dateStr > todayStr) {
        upcoming.push(row);
      } else {
        past.push(row);
      }
    }

    res.json({ today, upcoming, past });
  } catch (error) {
    logger.error('Error fetching events:', error);
    next(error);
  }
}

export async function createEvent(req: Request, res: Response, next: NextFunction) {
  const parsed = createEventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.errors });
  }
  const { title, details, category, date, staffIds } = parsed.data;
  try {
    const inserted = await pool.query(
      `INSERT INTO events (title, details, category, date) VALUES ($1,$2,$3,$4) RETURNING id`,
      [title, details, category, date]
    );
    const eventId = inserted.rows[0].id;
    if (staffIds && staffIds.length > 0) {
      const values = staffIds.map((_, i) => `($1,$${i + 2})`).join(',');
      await pool.query(
        `INSERT INTO event_staff (event_id, staff_id) VALUES ${values}`,
        [eventId, ...staffIds]
      );
    }
    res.status(201).json({ id: eventId });
  } catch (error) {
    logger.error('Error creating event:', error);
    next(error);
  }
}

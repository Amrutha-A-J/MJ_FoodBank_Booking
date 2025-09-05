import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import logger from '../utils/logger';
import { createEventSchema } from '../schemas/eventSchemas';
import { formatReginaDate } from '../utils/dateUtils';
import type { PoolClient } from 'pg';
import { parseIdParam } from '../utils/parseIdParam';

export async function listEvents(req: Request, res: Response, next: NextFunction) {
  try {
    const role = req.user?.role;
    let where = '';
    if (role === 'volunteer') {
      where = 'WHERE e.visible_to_volunteers = true';
    } else if (role === 'shopper' || role === 'delivery') {
      where = 'WHERE e.visible_to_clients = true';
    }
    const result = await pool.query(
      `SELECT e.id, e.title, e.details, e.category,
              e.start_date AS "startDate", e.end_date AS "endDate",
              e.created_at, e.updated_at,
              e.created_by AS "createdBy",
              e.visible_to_volunteers AS "visibleToVolunteers",
              e.visible_to_clients AS "visibleToClients",
              CONCAT(s.first_name, ' ', s.last_name) AS "createdByName",
              COALESCE(json_agg(es.staff_id) FILTER (WHERE es.staff_id IS NOT NULL), '[]') AS "staffIds"
       FROM events e
       JOIN staff s ON e.created_by = s.id
       LEFT JOIN event_staff es ON e.id = es.event_id
       ${where}
       GROUP BY e.id, s.first_name, s.last_name
       ORDER BY e.start_date ASC`
    );

    const today: any[] = [];
    const upcoming: any[] = [];
    const past: any[] = [];
    const todayStr = formatReginaDate(new Date());

    for (const row of result.rows) {
      const startStr = formatReginaDate(row.startDate);
      const endStr = formatReginaDate(row.endDate);
      if (startStr <= todayStr && endStr >= todayStr) {
        today.push(row);
      } else if (startStr > todayStr) {
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
    return res.status(400).json({ errors: parsed.error.issues });
  }
  const {
    title,
    details,
    category,
    startDate,
    endDate,
    staffIds,
    visibleToVolunteers = false,
    visibleToClients = false,
  } = parsed.data;
  let client: PoolClient | undefined;
  try {
    const createdBy = Number(req.user?.id);
    const start = formatReginaDate(startDate);
    const end = formatReginaDate(endDate);
    client = await pool.connect();
    await client.query('BEGIN');
    const inserted = await client.query(
      `INSERT INTO events (title, details, category, start_date, end_date, created_by, visible_to_volunteers, visible_to_clients) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [title, details, category, start, end, createdBy, visibleToVolunteers, visibleToClients]
    );
    const eventId = inserted.rows[0].id;
    if (staffIds && staffIds.length > 0) {
      const values = staffIds.map((_, i) => `($1,$${i + 2})`).join(',');
      await client.query(
        `INSERT INTO event_staff (event_id, staff_id) VALUES ${values}`,
        [eventId, ...staffIds]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ id: eventId });
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        logger.error('Error rolling back event creation:', rollbackError);
      }
    }
    logger.error('Error creating event:', error);
    next(error);
  } finally {
    client?.release();
  }
}

export async function deleteEvent(req: Request, res: Response, next: NextFunction) {
  const id = parseIdParam(req.params.id);
  if (id === null) {
    return res.status(400).json({ message: 'Invalid id' });
  }
  try {
    const result = await pool.query('DELETE FROM events WHERE id = $1', [id]);
    if ((result.rowCount ?? 0) === 0) {
      return res.status(404).json({ message: 'Event not found' });
    }
    res.json({ message: 'Deleted' });
  } catch (error) {
    logger.error('Error deleting event:', error);
    next(error);
  }
}

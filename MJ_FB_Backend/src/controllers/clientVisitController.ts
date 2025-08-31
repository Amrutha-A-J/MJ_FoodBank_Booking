import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import logger from '../utils/logger';
import { formatReginaDate } from '../utils/dateUtils';
import { Pool, PoolClient } from 'pg';

type Queryable = Pool | PoolClient;

async function refreshClientVisitCount(
  clientId: number,
  client: Queryable = pool,
) {
  await client.query(
    `UPDATE clients c
     SET bookings_this_month = (
       SELECT COUNT(*) FROM client_visits v
       WHERE v.client_id = c.client_id
         AND DATE_TRUNC('month', v.date) = DATE_TRUNC('month', CURRENT_DATE)
     ),
     booking_count_last_updated = NOW()
     WHERE c.client_id = $1`,
    [clientId],
  );
}

export async function listVisits(req: Request, res: Response, next: NextFunction) {
  try {
    const date = req.query.date as string;
    if (!date) return res.status(400).json({ message: 'Date required' });
    const result = await pool.query(
      `SELECT v.id, v.date, v.client_id as "clientId", v.weight_with_cart as "weightWithCart",
              v.weight_without_cart as "weightWithoutCart", v.pet_item as "petItem", v.is_anonymous as "anonymous",
              COALESCE(c.first_name || ' ' || c.last_name, '') as "clientName"
       FROM client_visits v
       LEFT JOIN clients c ON v.client_id = c.client_id
       WHERE v.date = $1
       ORDER BY v.id`,
      [date]
    );
    res.json(result.rows);
  } catch (error) {
    logger.error('Error listing client visits:', error);
    next(error);
  }
}

export async function addVisit(req: Request, res: Response, next: NextFunction) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { date, clientId, weightWithCart, weightWithoutCart, petItem, anonymous } = req.body;
    const result = await client.query(
      `INSERT INTO client_visits (date, client_id, weight_with_cart, weight_without_cart, pet_item, is_anonymous)
       VALUES ($1, $2, $3, $4, COALESCE($5,0), $6)
       RETURNING id, date, client_id as "clientId", weight_with_cart as "weightWithCart",
                 weight_without_cart as "weightWithoutCart", pet_item as "petItem", is_anonymous as "anonymous"`,
      [date, clientId ?? null, weightWithCart, weightWithoutCart, petItem ?? 0, anonymous ?? false],
    );
    let clientName: string | null = null;
    if (clientId) {
      const clientRes = await client.query(
        'SELECT first_name, last_name FROM clients WHERE client_id = $1',
        [clientId],
      );
      if ((clientRes.rowCount ?? 0) > 0) {
        clientName = `${clientRes.rows[0].first_name ?? ''} ${clientRes.rows[0].last_name ?? ''}`.trim();
      }

      // If the client had an approved booking on this date, mark it visited
      const bookingRes = await client.query(
        `SELECT b.id
           FROM bookings b
           INNER JOIN clients c ON b.user_id = c.client_id
           WHERE c.client_id = $1 AND b.date = $2 AND b.status = 'approved'`,
        [clientId, formatReginaDate(date)],
      );
      if ((bookingRes.rowCount ?? 0) > 0) {
        await client.query('UPDATE bookings SET status = $1 WHERE id = $2', [
          'visited',
          bookingRes.rows[0].id,
        ]);
      }

      // Handle other approved bookings in the same month
      const otherRes = await client.query(
        `SELECT id, date FROM bookings
         WHERE user_id = $1
           AND status = 'approved'
           AND DATE_TRUNC('month', date) = DATE_TRUNC('month', $2::date)
           AND date <> $2::date`,
        [clientId, formatReginaDate(date)],
      );
      for (const b of otherRes.rows) {
        const bookingDate = new Date(b.date);
        const visitDate = new Date(formatReginaDate(date));
        if (bookingDate > visitDate) {
          await client.query(
            'UPDATE bookings SET status=$1, date=$2, slot_id=NULL WHERE id=$3',
            ['visited', formatReginaDate(date), b.id],
          );
        } else {
          await client.query(
            'UPDATE bookings SET status=$1, slot_id=NULL WHERE id=$2',
            ['no_show', b.id],
          );
        }
      }

      await refreshClientVisitCount(clientId, client);
    }
    await client.query('COMMIT');
    client.release();
    res.status(201).json({ ...result.rows[0], clientName });
  } catch (error) {
    await client.query('ROLLBACK');
    client.release();
    logger.error('Error adding client visit:', error);
    next(error);
  }
}

export async function updateVisit(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { date, clientId, weightWithCart, weightWithoutCart, petItem, anonymous } = req.body;
    const existing = await pool.query('SELECT client_id FROM client_visits WHERE id = $1', [id]);
    const prevClientId: number | null = existing.rows[0]?.client_id ?? null;
    const result = await pool.query(
      `UPDATE client_visits
       SET date = $1, client_id = $2, weight_with_cart = $3, weight_without_cart = $4, pet_item = COALESCE($5,0), is_anonymous = $6
       WHERE id = $7
       RETURNING id, date, client_id as "clientId", weight_with_cart as "weightWithCart",
                 weight_without_cart as "weightWithoutCart", pet_item as "petItem", is_anonymous as "anonymous"`,
      [date, clientId ?? null, weightWithCart, weightWithoutCart, petItem ?? 0, anonymous ?? false, id]
    );
    let clientName: string | null = null;
    if (clientId) {
      const clientRes = await pool.query(
        'SELECT first_name, last_name FROM clients WHERE client_id = $1',
        [clientId]
      );
      if ((clientRes.rowCount ?? 0) > 0) {
        clientName = `${clientRes.rows[0].first_name ?? ''} ${clientRes.rows[0].last_name ?? ''}`.trim();
      }
    }
    if (prevClientId) await refreshClientVisitCount(prevClientId);
    if (clientId && clientId !== prevClientId) await refreshClientVisitCount(clientId);
    res.json({ ...result.rows[0], clientName });
  } catch (error) {
    logger.error('Error updating client visit:', error);
    next(error);
  }
}

export async function deleteVisit(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT client_id FROM client_visits WHERE id = $1', [id]);
    await pool.query('DELETE FROM client_visits WHERE id = $1', [id]);
    const clientId: number | null = existing.rows[0]?.client_id ?? null;
    if (clientId) await refreshClientVisitCount(clientId);
    res.json({ message: 'Deleted' });
  } catch (error) {
    logger.error('Error deleting client visit:', error);
    next(error);
  }
}

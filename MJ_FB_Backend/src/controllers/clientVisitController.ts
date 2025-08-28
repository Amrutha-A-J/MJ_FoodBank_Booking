import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import logger from '../utils/logger';

async function refreshClientVisitCount(clientId: number) {
  await pool.query(
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
  try {
    const { date, clientId, weightWithCart, weightWithoutCart, petItem, anonymous } = req.body;
    const result = await pool.query(
      `INSERT INTO client_visits (date, client_id, weight_with_cart, weight_without_cart, pet_item, is_anonymous)
       VALUES ($1, $2, $3, $4, COALESCE($5,0), $6)
       RETURNING id, date, client_id as "clientId", weight_with_cart as "weightWithCart",
                 weight_without_cart as "weightWithoutCart", pet_item as "petItem", is_anonymous as "anonymous"`,
      [date, clientId ?? null, weightWithCart, weightWithoutCart, petItem ?? 0, anonymous ?? false]
    );
    let clientName: string | null = null;
    if (clientId) {
      const clientRes = await pool.query(
        'SELECT id, first_name, last_name FROM clients WHERE client_id = $1',
        [clientId]
      );
      let userId: number | null = null;
      if ((clientRes.rowCount ?? 0) > 0) {
        const row = clientRes.rows[0];
        clientName = `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim();
        userId = row.id ?? null;
      }
      await refreshClientVisitCount(clientId);
      if (userId) {
        const bookingRes = await pool.query(
          `SELECT b.id, b.status, b.request_data FROM bookings b
           WHERE b.user_id = $1 AND b.date = $2 LIMIT 1`,
          [userId, date]
        );
        if ((bookingRes.rowCount ?? 0) > 0 && bookingRes.rows[0].status === 'approved') {
          const booking = bookingRes.rows[0];
          await pool.query(
            `UPDATE bookings SET status='visited', request_data=$2 WHERE id=$1`,
            [booking.id, booking.request_data]
          );
        }
      }
    }
    res.status(201).json({ ...result.rows[0], clientName });
  } catch (error) {
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

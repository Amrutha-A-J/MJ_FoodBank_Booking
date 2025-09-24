import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import logger from '../utils/logger';
import { formatReginaDate, getWeekForDate } from '../utils/dateUtils';
import { Queryable } from '../utils/bookingUtils';
import { updateBooking } from '../models/bookingRepository';
import {
  refreshPantryWeekly,
  refreshPantryMonthly,
  refreshPantryYearly,
} from './pantry/pantryAggregationController';
import { getCartTare } from '../utils/configCache';

export async function refreshClientVisitCount(
  clientId: number,
  client: Queryable = pool,
) {
  await client.query(
    `UPDATE clients c
     SET bookings_this_month = (
       SELECT COUNT(*) FROM client_visits v
       WHERE v.client_id = c.client_id
         AND v.is_anonymous = false
         AND v.date >= DATE_TRUNC('month', CURRENT_DATE)
         AND v.date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
     ),
     booking_count_last_updated = NOW()
     WHERE c.client_id = $1`,
    [clientId],
  );
}

export async function getClientBookingsThisMonth(
  clientId: number,
  client: Queryable = pool,
) {
  const res = await client.query(
    `SELECT bookings_this_month,
            DATE_TRUNC('month', booking_count_last_updated) = DATE_TRUNC('month', CURRENT_DATE) AS current
       FROM clients WHERE client_id = $1`,
    [clientId],
  );
  if ((res.rowCount ?? 0) === 0) return 0;
  let { bookings_this_month: count, current } = res.rows[0] as {
    bookings_this_month: number | null;
    current?: boolean;
  };
  if (current === false) {
    await refreshClientVisitCount(clientId, client);
    const refreshed = await client.query(
      'SELECT bookings_this_month FROM clients WHERE client_id = $1',
      [clientId],
    );
    count = refreshed.rows[0]?.bookings_this_month ?? 0;
  }
  return count ?? 0;
}

export async function getVisitStats(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const group = (req.query.group as string | undefined) ?? 'day';
    if (group === 'month') {
      const monthsParam = req.query.months as string | undefined;
      const months = monthsParam ? parseInt(monthsParam, 10) : 12;
      if (Number.isNaN(months) || months <= 0) {
        return res.status(400).json({ message: 'Invalid months' });
      }
      const result = await pool.query(
        `SELECT DATE_TRUNC('month', date) AS month,
                COUNT(DISTINCT CASE WHEN NOT is_anonymous THEN client_id END)::int AS clients,
                COALESCE(SUM(adults),0)::int AS adults,
                COALESCE(SUM(children),0)::int AS children
           FROM client_visits
          WHERE date >= DATE_TRUNC('month', CURRENT_DATE) - (($1::int - 1) * INTERVAL '1 month')
          GROUP BY DATE_TRUNC('month', date)
          ORDER BY DATE_TRUNC('month', date)`,
        [months],
      );
      const rows = result.rows.map(r => ({
        month: formatReginaDate(r.month).slice(0, 7),
        clients: Number(r.clients),
        adults: Number(r.adults),
        children: Number(r.children),
      }));
      res.json(rows);
      return;
    }

    const daysParam = req.query.days as string | undefined;
    const days = daysParam ? parseInt(daysParam, 10) : 30;
    if (Number.isNaN(days) || days <= 0) {
      return res.status(400).json({ message: 'Invalid days' });
    }
    const result = await pool.query(
      `SELECT date,
              COUNT(*)::int AS total,
              COALESCE(SUM(adults),0)::int AS adults,
              COALESCE(SUM(children),0)::int AS children
         FROM client_visits
        WHERE date >= CURRENT_DATE - ($1::int - 1)
        GROUP BY date
        ORDER BY date`,
      [days],
    );
    const rows = result.rows.map(r => ({
      date: formatReginaDate(r.date),
      total: Number(r.total),
      adults: Number(r.adults),
      children: Number(r.children),
    }));
    res.json(rows);
  } catch (error) {
    logger.error('Error fetching visit stats:', error);
    next(error);
  }
}

export async function listVisits(req: Request, res: Response, next: NextFunction) {
  try {
    const date = req.query.date as string;
    if (!date) return res.status(400).json({ message: 'Date required' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: 'Invalid date' });
    }
    const result = await pool.query(
      `SELECT v.id,
              to_char(v.date, 'YYYY-MM-DD') as date,
              v.client_id as "clientId",
              v.weight_with_cart as "weightWithCart",
              v.weight_without_cart as "weightWithoutCart",
              v.pet_item as "petItem",
              v.is_anonymous as "anonymous",
              v.note as "note",
              v.verified as "verified",
              v.adults,
              v.children,
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
    const {
      date,
      clientId,
      weightWithCart,
      weightWithoutCart,
      petItem,
      anonymous,
      note,
      adults,
      children,
      verified,
    } = req.body;
    await client.query('BEGIN');
    if (clientId && !anonymous) {
      const dup = await client.query(
        'SELECT 1 FROM client_visits WHERE client_id = $1 AND date = $2',
        [clientId, date],
      );
      if ((dup.rowCount ?? 0) > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ message: 'Duplicate visit' });
      }
    }
    const cartTare = await getCartTare(client);
    let weightWithoutCartAdjusted = weightWithoutCart;
    if (weightWithCart != null && weightWithoutCart == null) {
      weightWithoutCartAdjusted = weightWithCart - cartTare;
    }
    if (weightWithoutCartAdjusted != null && weightWithoutCartAdjusted < 0) {
      weightWithoutCartAdjusted = 0;
    }
    let insertRes;
    try {
      insertRes = await client.query(
        `INSERT INTO client_visits (date, client_id, weight_with_cart, weight_without_cart, pet_item, is_anonymous, note, adults, children, verified)
         VALUES ($1, $2, $3, $4, COALESCE($5,0), $6, $7, $8, $9, $10)
         RETURNING id, to_char(date, 'YYYY-MM-DD') as date, client_id as "clientId", weight_with_cart as "weightWithCart",
                   weight_without_cart as "weightWithoutCart", pet_item as "petItem", is_anonymous as "anonymous", note, adults, children, verified`,
        [
          date,
          clientId ?? null,
          weightWithCart ?? null,
          weightWithoutCartAdjusted ?? null,
          petItem ?? 0,
          anonymous ?? false,
          note ?? null,
          adults,
          children,
          verified ?? false,
        ]
      );
    } catch (err: any) {
      if (err.code === '23505') {
        await client.query('ROLLBACK');
        return res.status(409).json({ message: 'Duplicate visit' });
      }
      throw err;
    }
    let clientName: string | null = null;
    if (clientId) {
      const clientRes = await client.query(
        'SELECT first_name, last_name FROM clients WHERE client_id = $1',
        [clientId]
      );
      if ((clientRes.rowCount ?? 0) > 0) {
        clientName = `${clientRes.rows[0].first_name ?? ''} ${clientRes.rows[0].last_name ?? ''}`.trim();
      }
      await refreshClientVisitCount(clientId, client);
      if (!anonymous) {
        // If the client had an approved booking on this date, mark it visited
        const sameDayRes = await client.query(
          `SELECT b.id
             FROM bookings b
             INNER JOIN clients c ON b.user_id = c.client_id
             WHERE c.client_id = $1 AND b.date = $2 AND b.status = 'approved'`,
          [clientId, formatReginaDate(date)]
        );
        if ((sameDayRes.rowCount ?? 0) > 0) {
          await updateBooking(sameDayRes.rows[0].id, { status: 'visited', note: null }, client);
        }

        // Handle other approved bookings in the month
        const otherRes = await client.query(
          `SELECT b.id, b.date
             FROM bookings b
             INNER JOIN clients c ON b.user_id = c.client_id
             WHERE c.client_id = $1
               AND b.status = 'approved'
               AND DATE_TRUNC('month', b.date) = DATE_TRUNC('month', $2::date)
               AND b.date <> $2`,
          [clientId, formatReginaDate(date)]
        );
        const visitDate = new Date(formatReginaDate(date));
        for (const row of otherRes.rows) {
          const bookingDate = new Date(row.date);
          if (bookingDate > visitDate) {
            await updateBooking(
              row.id,
              { status: 'visited', slot_id: null, date: formatReginaDate(date), note: null },
              client,
            );
          } else {
            await updateBooking(row.id, { status: 'no_show', note: null }, client);
          }
        }
      }
    }
    await client.query('COMMIT');
    const { week, month, year } = getWeekForDate(date);
    await Promise.all([
      refreshPantryWeekly(year, month, week),
      refreshPantryMonthly(year, month),
      refreshPantryYearly(year),
    ]);
    res.status(201).json({ ...insertRes.rows[0], clientName });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error adding client visit:', error);
    next(error);
  } finally {
    client.release();
  }
}

export async function updateVisit(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const {
      date,
      clientId,
      weightWithCart,
      weightWithoutCart,
      petItem,
      anonymous,
      note,
      adults,
      children,
      verified,
    } = req.body;
    const existing = await pool.query(
      'SELECT client_id, date FROM client_visits WHERE id = $1',
      [id],
    );
    const prevClientId: number | null = existing.rows[0]?.client_id ?? null;
    const prevDate: string | null = existing.rows[0]?.date
      ? formatReginaDate(existing.rows[0].date)
      : null;
    if (clientId && !anonymous) {
      const dup = await pool.query(
        'SELECT 1 FROM client_visits WHERE client_id = $1 AND date = $2 AND id <> $3',
        [clientId, date, id],
      );
      if ((dup.rowCount ?? 0) > 0) {
        return res.status(409).json({ message: 'Duplicate visit' });
      }
    }
    const cartTare = await getCartTare();
    let weightWithoutCartAdjusted = weightWithoutCart;
    if (weightWithCart != null && weightWithoutCart == null) {
      weightWithoutCartAdjusted = weightWithCart - cartTare;
    }
    if (weightWithoutCartAdjusted != null && weightWithoutCartAdjusted < 0) {
      weightWithoutCartAdjusted = 0;
    }
    const result = await pool.query(
      `UPDATE client_visits
       SET date = $1, client_id = $2, weight_with_cart = $3, weight_without_cart = $4, pet_item = COALESCE($5,0), is_anonymous = $6, note = $7, adults = $8, children = $9, verified = COALESCE($10, verified)
       WHERE id = $11
       RETURNING id, to_char(date, 'YYYY-MM-DD') as date, client_id as "clientId", weight_with_cart as "weightWithCart",
                 weight_without_cart as "weightWithoutCart", pet_item as "petItem", is_anonymous as "anonymous", note, adults, children, verified`,
      [
        date,
        clientId ?? null,
        weightWithCart ?? null,
        weightWithoutCartAdjusted ?? null,
        petItem ?? 0,
        anonymous ?? false,
        note ?? null,
        adults,
        children,
        verified ?? null,
        id,
      ]
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
    const { week, month, year } = getWeekForDate(date);
    await Promise.all([
      refreshPantryWeekly(year, month, week),
      refreshPantryMonthly(year, month),
      refreshPantryYearly(year),
    ]);
    if (prevDate && prevDate !== date) {
      const prev = getWeekForDate(prevDate);
      await Promise.all([
        refreshPantryWeekly(prev.year, prev.month, prev.week),
        refreshPantryMonthly(prev.year, prev.month),
        refreshPantryYearly(prev.year),
      ]);
    }
    res.json({ ...result.rows[0], clientName });
  } catch (error) {
    logger.error('Error updating client visit:', error);
    next(error);
  }
}

export async function deleteVisit(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const existing = await pool.query(
      'SELECT client_id, date FROM client_visits WHERE id = $1',
      [id],
    );
    await pool.query('DELETE FROM client_visits WHERE id = $1', [id]);
    const clientId: number | null = existing.rows[0]?.client_id ?? null;
    const date: string | null = existing.rows[0]?.date
      ? formatReginaDate(existing.rows[0].date)
      : null;
    if (clientId) await refreshClientVisitCount(clientId);
    if (clientId && date) {
      const bookingRes = await pool.query(
        `SELECT id FROM bookings WHERE user_id = $1 AND date = $2 AND status = 'visited'`,
        [clientId, formatReginaDate(date)],
      );
      if ((bookingRes.rowCount ?? 0) > 0) {
        await updateBooking(
          bookingRes.rows[0].id,
          { status: 'approved', note: null },
          pool,
        );
      }
    }
    if (date) {
      const { week, month, year } = getWeekForDate(date);
      await Promise.all([
        refreshPantryWeekly(year, month, week),
        refreshPantryMonthly(year, month),
        refreshPantryYearly(year),
      ]);
    }
    res.json({ message: 'Deleted' });
  } catch (error) {
    logger.error('Error deleting client visit:', error);
    next(error);
  }
}

export async function toggleVisitVerification(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE client_visits v
       SET verified = NOT verified
       FROM clients c
       WHERE v.id = $1 AND v.client_id = c.client_id
       RETURNING v.id,
                 to_char(v.date, 'YYYY-MM-DD') as date,
                 v.client_id as "clientId",
                 c.first_name || ' ' || c.last_name as "clientName",
                 v.weight_with_cart as "weightWithCart",
                 v.weight_without_cart as "weightWithoutCart",
                 v.pet_item as "petItem",
                 v.is_anonymous as "anonymous",
                 v.note,
                 v.adults,
                 v.children,
                 v.verified`,
      [id],
    );
    if ((result.rowCount ?? 0) === 0)
      return res.status(404).json({ message: 'Not found' });
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error toggling client visit verification:', error);
    next(error);
  }
}

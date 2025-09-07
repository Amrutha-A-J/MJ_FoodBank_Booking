import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import logger from '../utils/logger';
import { formatReginaDate } from '../utils/dateUtils';
import { Queryable } from '../utils/bookingUtils';
import { updateBooking } from '../models/bookingRepository';
import readXlsxFile, { readSheetNames } from 'read-excel-file/node';
import type { PoolClient } from 'pg';
import fs from 'fs/promises';
import { importClientVisitsSchema } from '../schemas/clientVisitSchemas';

export async function refreshClientVisitCount(
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
                COUNT(DISTINCT client_id)::int AS clients,
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
    const result = await pool.query(
      `SELECT v.id,
              to_char(v.date, 'YYYY-MM-DD') as date,
              v.client_id as "clientId",
              v.weight_with_cart as "weightWithCart",
              v.weight_without_cart as "weightWithoutCart",
              v.pet_item as "petItem",
              v.is_anonymous as "anonymous",
              v.note as "note",
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
    } = req.body;
    await client.query('BEGIN');
    if (clientId) {
      const dup = await client.query(
        'SELECT 1 FROM client_visits WHERE client_id = $1 AND date = $2',
        [clientId, date],
      );
      if ((dup.rowCount ?? 0) > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ message: 'Duplicate visit' });
      }
    }
    const insertRes = await client.query(
      `INSERT INTO client_visits (date, client_id, weight_with_cart, weight_without_cart, pet_item, is_anonymous, note, adults, children)
       VALUES ($1, $2, $3, $4, COALESCE($5,0), $6, $7, $8, $9)
       RETURNING id, to_char(date, 'YYYY-MM-DD') as date, client_id as "clientId", weight_with_cart as "weightWithCart",
                 weight_without_cart as "weightWithoutCart", pet_item as "petItem", is_anonymous as "anonymous", note, adults, children`,
      [
        date,
        clientId ?? null,
        weightWithCart ?? null,
        weightWithoutCart ?? null,
        petItem ?? 0,
        anonymous ?? false,
        note ?? null,
        adults,
        children,
      ]
    );
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
    await client.query('COMMIT');
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
    } = req.body;
    const existing = await pool.query('SELECT client_id FROM client_visits WHERE id = $1', [id]);
    const prevClientId: number | null = existing.rows[0]?.client_id ?? null;
    if (clientId) {
      const dup = await pool.query(
        'SELECT 1 FROM client_visits WHERE client_id = $1 AND date = $2 AND id <> $3',
        [clientId, date, id],
      );
      if ((dup.rowCount ?? 0) > 0) {
        return res.status(409).json({ message: 'Duplicate visit' });
      }
    }
    const result = await pool.query(
      `UPDATE client_visits
       SET date = $1, client_id = $2, weight_with_cart = $3, weight_without_cart = $4, pet_item = COALESCE($5,0), is_anonymous = $6, note = $7, adults = $8, children = $9
       WHERE id = $10
       RETURNING id, to_char(date, 'YYYY-MM-DD') as date, client_id as "clientId", weight_with_cart as "weightWithCart",
                 weight_without_cart as "weightWithoutCart", pet_item as "petItem", is_anonymous as "anonymous", note, adults, children`,
      [
        date,
        clientId ?? null,
        weightWithCart ?? null,
        weightWithoutCart ?? null,
        petItem ?? 0,
        anonymous ?? false,
        note ?? null,
        adults,
        children,
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
    const date: string | null = existing.rows[0]?.date ?? null;
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
    res.json({ message: 'Deleted' });
  } catch (error) {
    logger.error('Error deleting client visit:', error);
    next(error);
  }
}

export async function bulkImportVisits(req: Request, res: Response, next: NextFunction) {
  const client = await pool.connect();
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'File required' });
    }
    const sheetNames = await readSheetNames(req.file.buffer);
    await client.query('BEGIN');

    const cartRes = await client.query(
      "SELECT value FROM app_config WHERE key = 'cart_tare'",
    );
    const cartTare = Number(cartRes.rows[0]?.value ?? 0);
    const createdClients: number[] = [];
    let imported = 0;
    const errors: Record<string, string[]> = {};

    const addError = (sheet: string, message: string) => {
      if (!errors[sheet]) errors[sheet] = [];
      errors[sheet].push(message);
    };

    for (const name of sheetNames) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(name)) {
        addError(name, 'Invalid sheet name');
        continue;
      }
      const rows = await readXlsxFile(req.file.buffer, { sheet: name });
      for (const [index, row] of rows.slice(1).entries()) {
        const [familySize, weightWithCart, weightWithoutCart, petItem, clientId] = row;
        if (String(clientId).toUpperCase() === 'SUNSHINE') {
          const match = /(?<adults>\d+)A(?<children>\d*)C?/.exec(String(familySize ?? ''));
          const adults = parseInt(match?.groups?.adults ?? '0', 10);
          const children = parseInt(match?.groups?.children || '0', 10);
          let weight = weightWithoutCart == null ? undefined : Number(weightWithoutCart);
          if (weight == null && weightWithCart != null) {
            weight = Number(weightWithCart) - cartTare;
          }
          if (weight == null || Number.isNaN(weight)) {
            addError(name, `Row ${index + 2}: Invalid weight`);
            continue;
          }
          await client.query(
            `INSERT INTO sunshine_bag_log (date, weight, client_count)
             VALUES ($1, $2, $3)
             ON CONFLICT (date) DO UPDATE SET weight = EXCLUDED.weight, client_count = EXCLUDED.client_count`,
            [formatReginaDate(name), weight, adults + children],
          );
          continue;
        }
        let parsed;
        try {
          parsed = importClientVisitsSchema.parse({
            familySize: String(familySize ?? ''),
            weightWithCart:
              weightWithCart == null ? undefined : Number(weightWithCart),
            weightWithoutCart:
              weightWithoutCart == null ? undefined : Number(weightWithoutCart),
            petItem: petItem == null ? undefined : Number(petItem),
            clientId: Number(clientId),
          });
        } catch (err: any) {
          addError(name, `Row ${index + 2}: ${err.message}`);
          continue;
        }
        const match = /(?<adults>\d+)A(?<children>\d*)C?/.exec(parsed.familySize);
        const adults = parseInt(match?.groups?.adults ?? '0', 10);
        const children = parseInt(match?.groups?.children || '0', 10);
        let weightWithCartVal = parsed.weightWithCart ?? null;
        const weightWithoutCartVal = parsed.weightWithoutCart ?? null;
        if (weightWithCartVal == null && weightWithoutCartVal != null) {
          weightWithCartVal = weightWithoutCartVal + cartTare;
        }
        const cid = parsed.clientId;
        const existing = await client.query('SELECT client_id FROM clients WHERE client_id = $1', [cid]);
        if ((existing.rowCount ?? 0) === 0) {
          const profileLink = `https://portal.link2feed.ca/org/1605/intake/${cid}`;
          await client.query(
            `INSERT INTO clients (client_id, role, online_access, profile_link) VALUES ($1, 'shopper', false, $2)`,
            [cid, profileLink],
          );
          createdClients.push(cid);
        }
        await client.query(
          `INSERT INTO client_visits (date, client_id, weight_with_cart, weight_without_cart, pet_item, adults, children, is_anonymous)
           VALUES ($1, $2, $3, $4, COALESCE($5,0), $6, $7, false)`,
          [
            formatReginaDate(name),
            cid,
            weightWithCartVal,
            weightWithoutCartVal,
            parsed.petItem ?? 0,
            adults,
            children,
          ],
        );
        await refreshClientVisitCount(cid, client);
        imported++;
      }
    }
    await client.query('COMMIT');
    res.json({ imported, newClients: createdClients, errors });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error bulk importing client visits:', error);
    next(error);
  } finally {
    client.release();
    if (req.file?.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (err) {
        logger.warn('Failed to delete uploaded file:', err);
      }
    }
  }
}

export async function importVisitsFromXlsx(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { dryRun } = req.query as {
    dryRun?: string;
  };

  if (!req.file) {
    return res.status(400).json({ message: 'File required' });
  }

  const isDryRun = dryRun === 'true';
  const summaries: { date: string; rowCount: number; errors: string[] }[] = [];

  let client: PoolClient | null = null;
  const cartRes = await pool.query(
    "SELECT value FROM app_config WHERE key = 'cart_tare'",
  );
  const cartTare = Number(cartRes.rows[0]?.value ?? 0);
  try {
    const sheetNames = await readSheetNames(req.file.buffer);
    if (!isDryRun) {
      client = await pool.connect();
      await client.query('BEGIN');
    }

    for (const sheetName of sheetNames) {
      const rows = await readXlsxFile(req.file.buffer, { sheet: sheetName });
      const sheetDate = sheetName;
      const formattedDate = formatReginaDate(sheetDate);
      const errors: string[] = [];

      const dataRows = rows.slice(1);
      let rowIndex = 1;
      for (const row of dataRows) {
        rowIndex++;
        const [familySize, weightWithCart, weightWithoutCart, petItem, clientId] = row;
        try {
          if (String(clientId).toUpperCase() === 'SUNSHINE') {
            const match = /(?<adults>\d+)A(?<children>\d*)C?/.exec(
              String(familySize ?? ''),
            );
            const adults = parseInt(match?.groups?.adults ?? '0', 10);
            const children = parseInt(match?.groups?.children || '0', 10);
            let weight =
              weightWithoutCart == null ? undefined : Number(weightWithoutCart);
            if (weight == null && weightWithCart != null) {
              weight = Number(weightWithCart) - cartTare;
            }
            if (weight == null || Number.isNaN(weight)) {
              throw new Error('Invalid weight');
            }
            if (isDryRun) continue;
            await client!.query(
              `INSERT INTO sunshine_bag_log (date, weight, client_count)
               VALUES ($1, $2, $3)
               ON CONFLICT (date) DO UPDATE SET weight = EXCLUDED.weight, client_count = EXCLUDED.client_count`,
              [formattedDate, weight, adults + children],
            );
            continue;
          }
          const parsed = importClientVisitsSchema.parse({
            familySize: String(familySize ?? ''),
            weightWithCart:
              weightWithCart == null ? undefined : Number(weightWithCart),
            weightWithoutCart:
              weightWithoutCart == null ? undefined : Number(weightWithoutCart),
            petItem: petItem == null ? 0 : Number(petItem),
            clientId: Number(clientId),
          });
          const match = /(?<adults>\d+)A(?<children>\d*)C?/.exec(parsed.familySize);
          const adults = parseInt(match?.groups?.adults ?? '0', 10);
          const children = parseInt(match?.groups?.children || '0', 10);

          let weightWithCartVal = parsed.weightWithCart ?? null;
          const weightWithoutCartVal = parsed.weightWithoutCart ?? null;
          if (weightWithCartVal == null && weightWithoutCartVal != null) {
            weightWithCartVal = weightWithoutCartVal + cartTare;
          }

          if (isDryRun) continue;

          const cid = parsed.clientId;
          const existingClient = await client!.query(
            'SELECT client_id FROM clients WHERE client_id = $1',
            [cid],
          );
          if ((existingClient.rowCount ?? 0) === 0) {
            const profileLink = `https://portal.link2feed.ca/org/1605/intake/${cid}`;
            await client!.query(
              `INSERT INTO clients (client_id, role, online_access, profile_link) VALUES ($1, 'shopper', false, $2)`,
              [cid, profileLink],
            );
          }

          const existingVisit = await client!.query(
            'SELECT id FROM client_visits WHERE client_id = $1 AND date = $2',
            [cid, formattedDate],
          );

          if ((existingVisit.rowCount ?? 0) > 0) {
            await client!.query(
              `UPDATE client_visits
                 SET weight_with_cart = $1,
                     weight_without_cart = $2,
                     pet_item = COALESCE($3,0),
                     adults = $4,
                     children = $5,
                     is_anonymous = false
                 WHERE id = $6`,
              [
                weightWithCartVal,
                weightWithoutCartVal,
                parsed.petItem ?? 0,
                adults,
                children,
                existingVisit.rows[0].id,
              ],
            );
            await refreshClientVisitCount(cid, client!);
          } else {
            await client!.query(
              `INSERT INTO client_visits (date, client_id, weight_with_cart, weight_without_cart, pet_item, adults, children, is_anonymous)
                 VALUES ($1, $2, $3, $4, COALESCE($5,0), $6, $7, false)`,
              [
                formattedDate,
                cid,
                weightWithCartVal,
                weightWithoutCartVal,
                parsed.petItem ?? 0,
                adults,
                children,
              ],
            );
            await refreshClientVisitCount(cid, client!);
          }
        } catch (err: any) {
          errors.push(
            `Row ${rowIndex}: ${err.errors?.[0]?.message || err.message}`,
          );
        }
      }

      summaries.push({ date: sheetDate, rowCount: dataRows.length, errors });
    }

    if (isDryRun) {
      res.json(summaries);
    } else {
      await client!.query('COMMIT');
      res.json({ summary: summaries });
    }
  } catch (error) {
    if (!isDryRun && client) await client.query('ROLLBACK');
    logger.error('Error importing client visits from xlsx:', error);
    next(error);
  } finally {
    if (client) client.release();
    if (req.file?.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (err) {
        logger.warn('Failed to delete uploaded file:', err);
      }
    }
  }
}

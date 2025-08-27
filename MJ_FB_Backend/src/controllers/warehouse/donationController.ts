import { Request, Response, NextFunction } from 'express';
import pool from '../../db';
import logger from '../../utils/logger';
import writeXlsxFile from 'write-excel-file/node';
import type { Row } from 'write-excel-file';
import { refreshWarehouseOverall } from './warehouseOverallController';

export async function listDonations(req: Request, res: Response, next: NextFunction) {
  try {
    const date = req.query.date as string;
    if (!date) return res.status(400).json({ message: 'Date required' });
    const result = await pool.query(
      `SELECT d.id, d.date, d.weight, d.donor_id as "donorId", o.name as donor
       FROM donations d JOIN donors o ON d.donor_id = o.id
       WHERE d.date = $1 ORDER BY d.id`,
      [date],
    );
    res.json(result.rows);
  } catch (error) {
    logger.error('Error listing donations:', error);
    next(error);
  }
}

export async function addDonation(req: Request, res: Response, next: NextFunction) {
  try {
    const { date, donorId, weight } = req.body;
    const result = await pool.query(
      'INSERT INTO donations (date, donor_id, weight) VALUES ($1, $2, $3) RETURNING id, date, donor_id as "donorId", weight',
      [date, donorId, weight],
    );
    const donorRes = await pool.query('SELECT name FROM donors WHERE id = $1', [donorId]);
    const dt = new Date(date);
    await refreshWarehouseOverall(dt.getUTCFullYear(), dt.getUTCMonth() + 1);
    res.status(201).json({ ...result.rows[0], donor: donorRes.rows[0].name });
  } catch (error) {
    logger.error('Error adding donation:', error);
    next(error);
  }
}

export async function updateDonation(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { date, donorId, weight } = req.body;
    const existing = await pool.query('SELECT date FROM donations WHERE id = $1', [id]);
    const oldDate = existing.rows[0]?.date as string | undefined;
    const result = await pool.query(
      'UPDATE donations SET date = $1, donor_id = $2, weight = $3 WHERE id = $4 RETURNING id, date, donor_id as "donorId", weight',
      [date, donorId, weight, id],
    );
    const donorRes = await pool.query('SELECT name FROM donors WHERE id = $1', [donorId]);
    const newDt = new Date(date);
    await refreshWarehouseOverall(newDt.getUTCFullYear(), newDt.getUTCMonth() + 1);
    if (oldDate) {
      const oldDt = new Date(oldDate);
      if (
        oldDt.getUTCFullYear() !== newDt.getUTCFullYear() ||
        oldDt.getUTCMonth() !== newDt.getUTCMonth()
      ) {
        await refreshWarehouseOverall(oldDt.getUTCFullYear(), oldDt.getUTCMonth() + 1);
      }
    }
    res.json({ ...result.rows[0], donor: donorRes.rows[0].name });
  } catch (error) {
    logger.error('Error updating donation:', error);
    next(error);
  }
}

export async function deleteDonation(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const existing = await pool.query('SELECT date FROM donations WHERE id = $1', [id]);
    await pool.query('DELETE FROM donations WHERE id = $1', [id]);
    if (existing.rows[0]) {
      const dt = new Date(existing.rows[0].date);
      await refreshWarehouseOverall(dt.getUTCFullYear(), dt.getUTCMonth() + 1);
    }
    res.json({ message: 'Deleted' });
  } catch (error) {
    logger.error('Error deleting donation:', error);
    next(error);
  }
}

export async function donorAggregations(req: Request, res: Response, next: NextFunction) {
  try {
    const year = parseInt((req.query.year as string) ?? '', 10) || new Date().getFullYear();
    const result = await pool.query(
      `SELECT o.name AS donor, m.month, COALESCE(a.total, 0) AS total
       FROM donors o
       CROSS JOIN generate_series(1, 12) AS m(month)
       LEFT JOIN donor_aggregations a ON a.donor_id = o.id
         AND a.year = $1
         AND a.month = m.month
       ORDER BY o.name, m.month`,
      [year],
    );

    const donorMap = new Map<string, { donor: string; monthlyTotals: number[]; total: number }>();
    for (const { donor, month, total } of result.rows as {
      donor: string;
      month: number;
      total: number;
    }[]) {
      if (!donorMap.has(donor)) {
        donorMap.set(donor, { donor, monthlyTotals: Array(12).fill(0), total: 0 });
      }
      const entry = donorMap.get(donor)!;
      entry.monthlyTotals[month - 1] = total ?? 0;
      entry.total += total ?? 0;
    }

    res.json(Array.from(donorMap.values()));
  } catch (error) {
    logger.error('Error listing donor aggregations:', error);
    next(error);
  }
}

export async function exportDonorAggregations(req: Request, res: Response, next: NextFunction) {
  try {
    const year = parseInt((req.query.year as string) ?? '', 10) || new Date().getFullYear();
    const result = await pool.query(
      `SELECT o.name AS donor, m.month, COALESCE(a.total, 0) AS total
       FROM donors o
       CROSS JOIN generate_series(1, 12) AS m(month)
       LEFT JOIN donor_aggregations a ON a.donor_id = o.id
         AND a.year = $1
         AND a.month = m.month
       ORDER BY o.name, m.month`,
      [year],
    );

    const headerStyle = {
      backgroundColor: '#000000',
      color: '#FFFFFF',
      fontWeight: 'bold',
    } as const;
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    const donorMap = new Map<string, number[]>();
    for (const { donor, month, total } of result.rows as {
      donor: string;
      month: number;
      total: number;
    }[]) {
      if (!donorMap.has(donor)) {
        donorMap.set(donor, Array(12).fill(0));
      }
      donorMap.get(donor)![month - 1] = total ?? 0;
    }

    const headerRow: Row = [
      { value: 'Donor', ...headerStyle },
      ...monthNames.map(m => ({ value: m, ...headerStyle })),
      { value: 'Total', ...headerStyle },
    ];

    const dataRows: Row[] = Array.from(donorMap.entries()).map(([donor, monthly]) => [
      { value: donor },
      ...monthly.map(total => ({ value: total })),
      { value: monthly.reduce((a, b) => a + b, 0) },
    ]);

    const rows: Row[] = [headerRow, ...dataRows];

    const buffer = await writeXlsxFile(rows, {
      sheet: `Donor Aggregations ${year}`,
      buffer: true,
    });

    res
      .setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      .setHeader(
        'Content-Disposition',
        `attachment; filename=${year}_donor_aggregations.xlsx`,
      );

    res.send(buffer);
  } catch (error) {
    logger.error('Error exporting donor aggregations:', error);
    next(error);
  }
}

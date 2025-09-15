import { Request, Response } from 'express';
import pool from '../../db';
import writeXlsxFile from 'write-excel-file/node';
import type { Row } from 'write-excel-file';
import { refreshWarehouseOverall } from './warehouseOverallController';
import { reginaStartOfDayISO } from '../../utils/dateUtils';
import asyncHandler from '../../middleware/asyncHandler';

export const listDonations = asyncHandler(async (req: Request, res: Response) => {
  const date = req.query.date as string | undefined;
  const month = req.query.month as string | undefined;
  if (!date && !month)
    return res.status(400).json({ message: 'Date or month required' });

  if (month) {
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const monthNum = parseInt(monthStr, 10);
    if (!year || !monthNum || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ message: 'Invalid month' });
    }
    const start = `${year}-${String(monthNum).padStart(2, '0')}-01`;
    const endDate = new Date(Date.UTC(year, monthNum, 1));
    const end = endDate.toISOString().slice(0, 10);
    const result = await pool.query(
      `SELECT d.id, d.date, d.weight, o.id as "donorId",
              o.first_name as "firstName", o.last_name as "lastName", o.email
         FROM donations d JOIN donors o ON d.donor_email = o.email
         WHERE d.date >= $1 AND d.date < $2 ORDER BY d.date, d.id`,
      [start, end],
    );
    return res.json(result.rows);
  }

  const result = await pool.query(
    `SELECT d.id, d.date, d.weight, o.id as "donorId",
            o.first_name as "firstName", o.last_name as "lastName", o.email
       FROM donations d JOIN donors o ON d.donor_email = o.email
       WHERE d.date = $1 ORDER BY d.id`,
    [date!],
  );
  res.json(result.rows);
});

export const addDonation = asyncHandler(async (req: Request, res: Response) => {
  const { date, donorId, weight } = req.body;
  const donorRes = await pool.query(
    'SELECT id, first_name AS "firstName", last_name AS "lastName", email FROM donors WHERE id = $1',
    [donorId],
  );
  const donor = donorRes.rows[0];
  if (!donor) {
    return res.status(404).json({ message: 'Donor not found' });
  }

  const result = await pool.query(
    'INSERT INTO donations (date, donor_email, weight) VALUES ($1, $2, $3) RETURNING id, date, weight',
    [date, donor.email, weight],
  );
  const dt = new Date(reginaStartOfDayISO(date));
  await refreshWarehouseOverall(dt.getUTCFullYear(), dt.getUTCMonth() + 1);
  const { id: donorIdValue, firstName, lastName, email } = donor;
  res.status(201).json({
    ...result.rows[0],
    donorId: donorIdValue,
    firstName,
    lastName,
    email,
  });
});

export const updateDonation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { date, donorId, weight } = req.body;
  const existing = await pool.query('SELECT date FROM donations WHERE id = $1', [id]);
  const oldDate = existing.rows[0]?.date as string | undefined;
  if (!oldDate) {
    return res.status(404).json({ message: 'Donation not found' });
  }
  const donorRes = await pool.query(
    'SELECT id, first_name AS "firstName", last_name AS "lastName", email FROM donors WHERE id = $1',
    [donorId],
  );
  const donor = donorRes.rows[0];
  if (!donor) {
    return res.status(404).json({ message: 'Donor not found' });
  }
  const result = await pool.query(
    'UPDATE donations SET date = $1, donor_email = $2, weight = $3 WHERE id = $4 RETURNING id, date, weight',
    [date, donor.email, weight, id],
  );
  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'Donation not found' });
  }
  const newDt = new Date(reginaStartOfDayISO(date));
  await refreshWarehouseOverall(newDt.getUTCFullYear(), newDt.getUTCMonth() + 1);
  const oldDt = new Date(reginaStartOfDayISO(oldDate));
  if (
    oldDt.getUTCFullYear() !== newDt.getUTCFullYear() ||
    oldDt.getUTCMonth() !== newDt.getUTCMonth()
  ) {
    await refreshWarehouseOverall(oldDt.getUTCFullYear(), oldDt.getUTCMonth() + 1);
  }
  const { id: donorIdValue, firstName, lastName, email } = donor;
  res.json({
    ...result.rows[0],
    donorId: donorIdValue,
    firstName,
    lastName,
    email,
  });
});

export const deleteDonation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const existing = await pool.query('SELECT date FROM donations WHERE id = $1', [id]);
  await pool.query('DELETE FROM donations WHERE id = $1', [id]);
  if (existing.rows[0]) {
    const dt = new Date(reginaStartOfDayISO(existing.rows[0].date));
    await refreshWarehouseOverall(dt.getUTCFullYear(), dt.getUTCMonth() + 1);
  }
  res.json({ message: 'Deleted' });
});

export const manualDonorAggregation = asyncHandler(async (req: Request, res: Response) => {
  const year = Number(req.body.year);
  const month = Number(req.body.month);
  const donorEmail = (req.body.donorEmail as string | undefined)?.trim();
  const total = Number(req.body.total) || 0;
  if (!year || !month || !donorEmail) {
    return res.status(400).json({ message: 'Year, month, and donorEmail required' });
  }
  await pool.query(
    `INSERT INTO donor_aggregations (year, month, donor_email, total)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (year, month, donor_email)
       DO UPDATE SET total = EXCLUDED.total`,
    [year, month, donorEmail, total],
  );
  res.json({ message: 'Saved' });
});

export const donorAggregations = asyncHandler(async (req: Request, res: Response) => {
  const year =
    parseInt((req.query.year as string) ?? '', 10) ||
    new Date(reginaStartOfDayISO(new Date())).getUTCFullYear();
  const result = await pool.query(
    `SELECT o.first_name || ' ' || o.last_name AS donor, o.email, m.month, COALESCE(a.total, 0) AS total
       FROM donors o
       CROSS JOIN generate_series(1, 12) AS m(month)
       LEFT JOIN donor_aggregations a ON a.donor_email = o.email
         AND a.year = $1
         AND a.month = m.month
       ORDER BY o.first_name, o.last_name, m.month`,
    [year],
  );
  const donorMap = new Map<string, { donor: string; email: string; monthlyTotals: number[]; total: number }>();
  for (const { donor, email, month, total } of result.rows as {
    donor: string;
    email: string;
    month: number;
    total: number;
  }[]) {
    if (!donorMap.has(email)) {
      donorMap.set(email, { donor, email, monthlyTotals: Array(12).fill(0), total: 0 });
    }
    const entry = donorMap.get(email)!;
    entry.monthlyTotals[month - 1] = total ?? 0;
    entry.total += total ?? 0;
  }

  res.json(Array.from(donorMap.values()));
});

export const exportDonorAggregations = asyncHandler(
  async (req: Request, res: Response) => {
    const year =
      parseInt((req.query.year as string) ?? '', 10) ||
      new Date(reginaStartOfDayISO(new Date())).getUTCFullYear();
    const result = await pool.query(
      `SELECT o.first_name || ' ' || o.last_name AS donor, m.month, COALESCE(a.total, 0) AS total
       FROM donors o
       CROSS JOIN generate_series(1, 12) AS m(month)
       LEFT JOIN donor_aggregations a ON a.donor_email = o.email
         AND a.year = $1
         AND a.month = m.month
       ORDER BY o.first_name, o.last_name, m.month`,
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
  },
);


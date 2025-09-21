import { Request, Response } from 'express';
import pool from '../../db';
import writeXlsxFile from 'write-excel-file/node';
import type { Row } from 'write-excel-file';
import { reginaStartOfDayISO } from '../../utils/dateUtils';
import asyncHandler from '../../middleware/asyncHandler';

export async function refreshWarehouseOverall(year: number, month: number) {
  const startDate = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
  const endDate = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);

  const [donationsRes, surplusRes, pigRes, outgoingRes, donorAggRes] = await Promise.all([
    pool.query(
      `SELECT
           COALESCE(SUM(CASE WHEN COALESCE(o.is_pet_food, FALSE) THEN COALESCE(d.weight, 0) ELSE 0 END)::int, 0) AS "petFood",
           COALESCE(SUM(CASE WHEN NOT COALESCE(o.is_pet_food, FALSE) THEN COALESCE(d.weight, 0) ELSE 0 END)::int, 0) AS "donations"
         FROM donations d
         LEFT JOIN donors o ON d.donor_id = o.id
         WHERE d.date >= $1 AND d.date < $2`,
      [startDate, endDate],
    ),
    pool.query(
      `SELECT COALESCE(SUM(weight)::int, 0) AS total
         FROM surplus_log
         WHERE date >= $1 AND date < $2`,
      [startDate, endDate],
    ),
    pool.query(
      `SELECT COALESCE(SUM(weight)::int, 0) AS total
         FROM pig_pound_log
         WHERE date >= $1 AND date < $2`,
      [startDate, endDate],
    ),
    pool.query(
      `SELECT COALESCE(SUM(weight)::int, 0) AS total
         FROM outgoing_donation_log
         WHERE date >= $1 AND date < $2`,
      [startDate, endDate],
    ),
    pool.query(
      `SELECT o.id AS "donorId", COALESCE(SUM(d.weight)::int, 0) AS total
         FROM donations d
         JOIN donors o ON d.donor_id = o.id
         WHERE d.date >= $1 AND d.date < $2
         GROUP BY o.id`,
      [startDate, endDate],
    ),
  ]);

  const donations = Number(donationsRes.rows[0]?.donations ?? 0);
  const petFood = Number(donationsRes.rows[0]?.petFood ?? 0);
  const surplus = Number(surplusRes.rows[0]?.total ?? 0);
  const pigPound = Number(pigRes.rows[0]?.total ?? 0);
  const outgoingDonations = Number(outgoingRes.rows[0]?.total ?? 0);

  await pool.query(
    `INSERT INTO warehouse_overall (year, month, donations, surplus, pig_pound, outgoing_donations, pet_food)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (year, month)
       DO UPDATE SET donations = EXCLUDED.donations,
                     surplus = EXCLUDED.surplus,
                     pig_pound = EXCLUDED.pig_pound,
                     outgoing_donations = EXCLUDED.outgoing_donations,
                     pet_food = EXCLUDED.pet_food`,
    [year, month, donations, surplus, pigPound, outgoingDonations, petFood],
  );

  // Refresh donor aggregations for the given month
  const donorRows = donorAggRes.rows as { donorId: number; total: number }[];
  await pool.query('DELETE FROM donor_aggregations WHERE year = $1 AND month = $2', [year, month]);
  if (donorRows.length > 0) {
    const valueClauses = donorRows
      .map((_, i) => `($1, $2, $${i * 2 + 3}, $${i * 2 + 4})`)
      .join(',');
    const params = [year, month, ...donorRows.flatMap(r => [r.donorId, r.total])];
    await pool.query(
      `INSERT INTO donor_aggregations (year, month, donor_id, total) VALUES ${valueClauses}`,
      params,
    );
  }
}

export const manualWarehouseOverall = asyncHandler(async (req: Request, res: Response) => {
  const year = Number(req.body.year);
  const month = Number(req.body.month);
  if (!year || !month) return res.status(400).json({ message: 'Year and month required' });
  const donations = Number(req.body.donations) || 0;
  const petFood = Number(req.body.petFood) || 0;
  const surplus = Number(req.body.surplus) || 0;
  const pigPound = Number(req.body.pigPound) || 0;
  const outgoingDonations = Number(req.body.outgoingDonations) || 0;

  await pool.query(
    `INSERT INTO warehouse_overall (year, month, donations, surplus, pig_pound, outgoing_donations, pet_food)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (year, month)
       DO UPDATE SET donations = EXCLUDED.donations,
                     surplus = EXCLUDED.surplus,
                     pig_pound = EXCLUDED.pig_pound,
                     outgoing_donations = EXCLUDED.outgoing_donations,
                     pet_food = EXCLUDED.pet_food`,
    [year, month, donations, surplus, pigPound, outgoingDonations, petFood],
  );

  res.json({ message: 'Saved' });
});

export const listWarehouseOverall = asyncHandler(async (req: Request, res: Response) => {
  const year =
    parseInt((req.query.year as string) ?? '', 10) ||
    new Date(reginaStartOfDayISO(new Date())).getUTCFullYear();
  const result = await pool.query(
    `SELECT month, donations, pet_food as "petFood", surplus, pig_pound as "pigPound", outgoing_donations as "outgoingDonations"
       FROM warehouse_overall
       WHERE year = $1
       ORDER BY month`,
    [year],
  );
  res.json(result.rows);
});

export const listAvailableYears = asyncHandler(async (_req: Request, res: Response) => {
  const result = await pool.query('SELECT DISTINCT year FROM warehouse_overall ORDER BY year DESC');
  res.json(result.rows.map(r => r.year));
});

export const exportWarehouseOverall = asyncHandler(async (req: Request, res: Response) => {
  const year =
    parseInt((req.query.year as string) ?? '', 10) ||
    new Date(reginaStartOfDayISO(new Date())).getUTCFullYear();
  const result = await pool.query(
    `SELECT month, donations, pet_food as "petFood", surplus, pig_pound as "pigPound", outgoing_donations as "outgoingDonations"
       FROM warehouse_overall
       WHERE year = $1
       ORDER BY month`,
    [year],
  );

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

  const dataByMonth = new Map(result.rows.map(r => [r.month, r]));

  const headerStyle = {
    backgroundColor: '#000000',
    color: '#FFFFFF',
    fontWeight: 'bold' as const,
  };

  const rows: Row[] = [
    [
      { value: 'Month', ...headerStyle },
      { value: 'Donations', ...headerStyle },
      { value: 'Pet Food Donations', ...headerStyle },
      { value: 'Surplus', ...headerStyle },
      { value: 'Pig Pound', ...headerStyle },
      { value: 'Outgoing Donations', ...headerStyle },
    ],
  ];

  let totals = { donations: 0, petFood: 0, surplus: 0, pigPound: 0, outgoingDonations: 0 };

  for (let m = 1; m <= 12; m++) {
    const row =
      dataByMonth.get(m) || {
        donations: 0,
        petFood: 0,
        surplus: 0,
        pigPound: 0,
        outgoingDonations: 0,
      };
    rows.push([
      { value: monthNames[m - 1] },
      { value: row.donations },
      { value: row.petFood },
      { value: row.surplus },
      { value: row.pigPound },
      { value: row.outgoingDonations },
    ]);
    totals = {
      donations: totals.donations + row.donations,
      petFood: totals.petFood + row.petFood,
      surplus: totals.surplus + row.surplus,
      pigPound: totals.pigPound + row.pigPound,
      outgoingDonations: totals.outgoingDonations + row.outgoingDonations,
    };
  }

  rows.push([
    { value: 'Total', fontWeight: 'bold' },
    { value: totals.donations, fontWeight: 'bold' },
    { value: totals.petFood, fontWeight: 'bold' },
    { value: totals.surplus, fontWeight: 'bold' },
    { value: totals.pigPound, fontWeight: 'bold' },
    { value: totals.outgoingDonations, fontWeight: 'bold' },
  ]);

  const buffer = await writeXlsxFile(rows, {
    sheet: `Warehouse ${year}`,
    buffer: true,
  });
  res
    .setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    .setHeader(
      'Content-Disposition',
      `attachment; filename=${year}_warehouse_overall_stats.xlsx`,
    );

  res.send(buffer);
});

export const rebuildWarehouseOverall = asyncHandler(async (req: Request, res: Response) => {
  const year =
    parseInt((req.query.year as string) ?? '', 10) ||
    new Date(reginaStartOfDayISO(new Date())).getUTCFullYear();
  for (let m = 1; m <= 12; m++) {
    await refreshWarehouseOverall(year, m);
  }
  res.json({ message: 'Rebuilt' });
});


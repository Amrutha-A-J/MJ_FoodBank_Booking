import { Request, Response, NextFunction } from 'express';
import pool from '../../db';
import logger from '../../utils/logger';
import writeXlsxFile from 'write-excel-file/node';

export async function listWarehouseOverall(req: Request, res: Response, next: NextFunction) {
  try {
    const year = parseInt((req.query.year as string) ?? '', 10) || new Date().getFullYear();
    const result = await pool.query(
      `SELECT month, donations, surplus, pig_pound as "pigPound", outgoing_donations as "outgoingDonations"
       FROM warehouse_overall
       WHERE year = $1
       ORDER BY month`,
      [year],
    );
    res.json(result.rows);
  } catch (error) {
    logger.error('Error listing warehouse overall:', error);
    next(error);
  }
}

export async function listAvailableYears(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await pool.query('SELECT DISTINCT year FROM warehouse_overall ORDER BY year DESC');
    res.json(result.rows.map(r => r.year));
  } catch (error) {
    logger.error('Error listing warehouse overall years:', error);
    next(error);
  }
}

export async function exportWarehouseOverall(req: Request, res: Response, next: NextFunction) {
  try {
    const year = parseInt((req.query.year as string) ?? '', 10) || new Date().getFullYear();
    const result = await pool.query(
      `SELECT month, donations, surplus, pig_pound as "pigPound", outgoing_donations as "outgoingDonations"
       FROM warehouse_overall
       WHERE year = $1
       ORDER BY month`,
      [year],
    );

    const headerStyle = {
      backgroundColor: '#000000',
      color: '#FFFFFF',
      fontWeight: 'bold',
    };
    const rows = [
      [
        { value: 'Month', ...headerStyle },
        { value: 'Donations', ...headerStyle },
        { value: 'Surplus', ...headerStyle },
        { value: 'Pig Pound', ...headerStyle },
        { value: 'Outgoing Donations', ...headerStyle },
      ],
      ...result.rows.map(row => [
        row.month,
        row.donations,
        row.surplus,
        row.pigPound,
        row.outgoingDonations,
      ]),
    ];
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
        `attachment; filename=warehouse-overall-${year}.xlsx`,
      );

    res.send(buffer);
  } catch (error) {
    logger.error('Error exporting warehouse overall:', error);
    next(error);
  }
}

export async function rebuildWarehouseOverall(req: Request, res: Response, next: NextFunction) {
  try {
    const year = parseInt((req.query.year as string) ?? '', 10) || new Date().getFullYear();

    const [donationsRes, surplusRes, pigRes, outgoingRes] = await Promise.all([
      pool.query(
        `SELECT EXTRACT(MONTH FROM date) as month, SUM(weight)::int as total
         FROM donations
         WHERE EXTRACT(YEAR FROM date) = $1
         GROUP BY month`,
        [year],
      ),
      pool.query(
        `SELECT EXTRACT(MONTH FROM date) as month, SUM(weight)::int as total
         FROM surplus_log
         WHERE EXTRACT(YEAR FROM date) = $1
         GROUP BY month`,
        [year],
      ),
      pool.query(
        `SELECT EXTRACT(MONTH FROM date) as month, SUM(weight)::int as total
         FROM pig_pound_log
         WHERE EXTRACT(YEAR FROM date) = $1
         GROUP BY month`,
        [year],
      ),
      pool.query(
        `SELECT EXTRACT(MONTH FROM date) as month, SUM(weight)::int as total
         FROM outgoing_donation_log
         WHERE EXTRACT(YEAR FROM date) = $1
         GROUP BY month`,
        [year],
      ),
    ]);

    const data: { [month: number]: { donations: number; surplus: number; pig_pound: number; outgoing_donations: number } } = {};
    for (let m = 1; m <= 12; m++) {
      data[m] = { donations: 0, surplus: 0, pig_pound: 0, outgoing_donations: 0 };
    }

    donationsRes.rows.forEach(r => {
      data[Number(r.month)].donations = Number(r.total);
    });
    surplusRes.rows.forEach(r => {
      data[Number(r.month)].surplus = Number(r.total);
    });
    pigRes.rows.forEach(r => {
      data[Number(r.month)].pig_pound = Number(r.total);
    });
    outgoingRes.rows.forEach(r => {
      data[Number(r.month)].outgoing_donations = Number(r.total);
    });

    for (let m = 1; m <= 12; m++) {
      const d = data[m];
      await pool.query(
        `INSERT INTO warehouse_overall (year, month, donations, surplus, pig_pound, outgoing_donations)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (year, month)
         DO UPDATE SET donations = EXCLUDED.donations,
                       surplus = EXCLUDED.surplus,
                       pig_pound = EXCLUDED.pig_pound,
                       outgoing_donations = EXCLUDED.outgoing_donations`,
        [year, m, d.donations, d.surplus, d.pig_pound, d.outgoing_donations],
      );
    }

    res.json({ message: 'Rebuilt' });
  } catch (error) {
    logger.error('Error rebuilding warehouse overall:', error);
    next(error);
  }
}

import { Request, Response, NextFunction } from 'express';
import pool from '../../db';
import logger from '../../utils/logger';
import writeXlsxFile from 'write-excel-file/node';
import type { Row } from 'write-excel-file';
import { reginaStartOfDayISO } from '../../utils/dateUtils';

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function refreshPantryWeekly(year: number, month: number, week: number) {
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const firstMonday = startOfWeek(monthStart);
  const start = new Date(firstMonday);
  start.setUTCDate(firstMonday.getUTCDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 4);

  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const [visitsRes, bagRes] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) FILTER (WHERE NOT is_anonymous)::int AS visits,
              COALESCE(SUM(adults) FILTER (WHERE NOT is_anonymous),0)::int AS adults,
              COALESCE(SUM(children) FILTER (WHERE NOT is_anonymous),0)::int AS children,
              COALESCE(SUM(weight_without_cart),0)::int AS weight
         FROM client_visits
        WHERE date >= $1 AND date <= $2`,
      [startStr, endStr],
    ),
    pool.query(
      `SELECT COALESCE(SUM(client_count)::int,0) AS clients,
              COALESCE(SUM(weight)::int,0) AS weight
         FROM sunshine_bag_log
        WHERE date >= $1 AND date <= $2`,
      [startStr, endStr],
    ),
  ]);

  const visitClients = Number(visitsRes.rows[0]?.visits ?? 0);
  const adults = Number(visitsRes.rows[0]?.adults ?? 0);
  const children = Number(visitsRes.rows[0]?.children ?? 0);
  const visitWeight = Number(visitsRes.rows[0]?.weight ?? 0);
  const bagClients = Number(bagRes.rows[0]?.clients ?? 0);
  const bagWeight = Number(bagRes.rows[0]?.weight ?? 0);

  const clients = visitClients;
  const totalWeight = visitWeight + bagWeight;

  await pool.query(
    `INSERT INTO pantry_weekly_overall (year, month, week, clients, adults, children, total_weight, sunshine_bags, sunshine_bag_weight)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (year, month, week)
       DO UPDATE SET clients = EXCLUDED.clients,
                     adults = EXCLUDED.adults,
                     children = EXCLUDED.children,
                     total_weight = EXCLUDED.total_weight,
                     sunshine_bags = EXCLUDED.sunshine_bags,
                     sunshine_bag_weight = EXCLUDED.sunshine_bag_weight`,
    [year, month, week, clients, adults, children, totalWeight, bagClients, bagWeight],
  );
}

export async function refreshPantryMonthly(year: number, month: number) {
  const [visitsRes, bagRes] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) FILTER (WHERE NOT is_anonymous)::int AS visits,
              COALESCE(SUM(adults) FILTER (WHERE NOT is_anonymous),0)::int AS adults,
              COALESCE(SUM(children) FILTER (WHERE NOT is_anonymous),0)::int AS children,
              COALESCE(SUM(weight_without_cart),0)::int AS weight
         FROM client_visits
        WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2`,
      [year, month],
    ),
    pool.query(
      `SELECT COALESCE(SUM(client_count)::int,0) AS clients,
              COALESCE(SUM(weight)::int,0) AS weight
         FROM sunshine_bag_log
        WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2`,
      [year, month],
    ),
  ]);

  const visitClients = Number(visitsRes.rows[0]?.visits ?? 0);
  const adults = Number(visitsRes.rows[0]?.adults ?? 0);
  const children = Number(visitsRes.rows[0]?.children ?? 0);
  const visitWeight = Number(visitsRes.rows[0]?.weight ?? 0);
  const bagClients = Number(bagRes.rows[0]?.clients ?? 0);
  const bagWeight = Number(bagRes.rows[0]?.weight ?? 0);

  const clients = visitClients;
  const totalWeight = visitWeight + bagWeight;

  await pool.query(
    `INSERT INTO pantry_monthly_overall (year, month, clients, adults, children, total_weight, sunshine_bags, sunshine_bag_weight)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (year, month)
       DO UPDATE SET clients = EXCLUDED.clients,
                     adults = EXCLUDED.adults,
                     children = EXCLUDED.children,
                     total_weight = EXCLUDED.total_weight,
                     sunshine_bags = EXCLUDED.sunshine_bags,
                     sunshine_bag_weight = EXCLUDED.sunshine_bag_weight`,
    [year, month, clients, adults, children, totalWeight, bagClients, bagWeight],
  );
}

export async function refreshPantryYearly(year: number) {
  const [visitsRes, bagRes] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) FILTER (WHERE NOT is_anonymous)::int AS visits,
              COALESCE(SUM(adults) FILTER (WHERE NOT is_anonymous),0)::int AS adults,
              COALESCE(SUM(children) FILTER (WHERE NOT is_anonymous),0)::int AS children,
              COALESCE(SUM(weight_without_cart),0)::int AS weight
         FROM client_visits
        WHERE EXTRACT(YEAR FROM date) = $1`,
      [year],
    ),
    pool.query(
      `SELECT COALESCE(SUM(client_count)::int,0) AS clients,
              COALESCE(SUM(weight)::int,0) AS weight
         FROM sunshine_bag_log
        WHERE EXTRACT(YEAR FROM date) = $1`,
      [year],
    ),
  ]);

  const visitClients = Number(visitsRes.rows[0]?.visits ?? 0);
  const adults = Number(visitsRes.rows[0]?.adults ?? 0);
  const children = Number(visitsRes.rows[0]?.children ?? 0);
  const visitWeight = Number(visitsRes.rows[0]?.weight ?? 0);
  const bagClients = Number(bagRes.rows[0]?.clients ?? 0);
  const bagWeight = Number(bagRes.rows[0]?.weight ?? 0);

  const clients = visitClients;
  const totalWeight = visitWeight + bagWeight;

  await pool.query(
    `INSERT INTO pantry_yearly_overall (year, clients, adults, children, total_weight, sunshine_bags, sunshine_bag_weight)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (year)
       DO UPDATE SET clients = EXCLUDED.clients,
                     adults = EXCLUDED.adults,
                     children = EXCLUDED.children,
                     total_weight = EXCLUDED.total_weight,
                     sunshine_bags = EXCLUDED.sunshine_bags,
                     sunshine_bag_weight = EXCLUDED.sunshine_bag_weight`,
    [year, clients, adults, children, totalWeight, bagClients, bagWeight],
  );
}

export async function listPantryWeekly(req: Request, res: Response, next: NextFunction) {
  try {
    const year = parseInt((req.query.year as string) ?? '', 10);
    const month = parseInt((req.query.month as string) ?? '', 10);
    if (!year || !month) return res.status(400).json({ message: 'Year and month required' });
    const result = await pool.query(
      `SELECT week, clients, adults, children, total_weight as "foodWeight", sunshine_bags as "sunshineBags", sunshine_bag_weight as "sunshineWeight"
         FROM pantry_weekly_overall
        WHERE year = $1 AND month = $2
        ORDER BY week`,
      [year, month],
    );
    res.json(result.rows);
  } catch (error) {
    logger.error('Error listing pantry weekly:', error);
    next(error);
  }
}

export async function listPantryMonthly(req: Request, res: Response, next: NextFunction) {
  try {
    const year =
      parseInt((req.query.year as string) ?? '', 10) ||
      new Date(reginaStartOfDayISO(new Date())).getUTCFullYear();
    const result = await pool.query(
      `SELECT month, clients, adults, children, total_weight as "foodWeight", sunshine_bags as "sunshineBags", sunshine_bag_weight as "sunshineWeight"
         FROM pantry_monthly_overall
        WHERE year = $1
        ORDER BY month`,
      [year],
    );
    res.json(result.rows);
  } catch (error) {
    logger.error('Error listing pantry monthly:', error);
    next(error);
  }
}

export async function listPantryYearly(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await pool.query(
      `SELECT year, clients, adults, children, total_weight as "foodWeight", sunshine_bags as "sunshineBags", sunshine_bag_weight as "sunshineWeight"
         FROM pantry_yearly_overall
        ORDER BY year`,
    );
    res.json(result.rows);
  } catch (error) {
    logger.error('Error listing pantry yearly:', error);
    next(error);
  }
}

export async function listAvailableYears(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await pool.query('SELECT DISTINCT year FROM pantry_yearly_overall ORDER BY year DESC');
    res.json(result.rows.map(r => r.year));
  } catch (error) {
    logger.error('Error listing pantry years:', error);
    next(error);
  }
}

export async function exportPantryWeekly(req: Request, res: Response, next: NextFunction) {
  try {
    const year = parseInt((req.query.year as string) ?? '', 10);
    const month = parseInt((req.query.month as string) ?? '', 10);
    const week = parseInt((req.query.week as string) ?? '', 10);
    if (!year || !month || !week)
      return res.status(400).json({ message: 'Year, month and week required' });
    const result = await pool.query(
      `SELECT start_date as "startDate", end_date as "endDate", clients, adults, children,
              total_weight as "foodWeight", sunshine_bags as "sunshineBags", sunshine_bag_weight as "sunshineWeight"
         FROM pantry_weekly_overall
        WHERE year = $1 AND month = $2 AND week = $3`,
      [year, month, week],
    );

    const row =
      result.rows[0] || {
        startDate: null,
        endDate: null,
        clients: 0,
        adults: 0,
        children: 0,
        foodWeight: 0,
        sunshineBags: 0,
        sunshineWeight: 0,
      };

    const headerStyle = {
      backgroundColor: '#000000',
      color: '#FFFFFF',
      fontWeight: 'bold' as const,
    };

    const rows: Row[] = [
      [
        { value: 'Range/Month/Year', ...headerStyle },
        { value: 'Clients', ...headerStyle },
        { value: 'Adults', ...headerStyle },
        { value: 'Children', ...headerStyle },
        { value: 'Food Weight', ...headerStyle },
        { value: 'Sunshine Bags', ...headerStyle },
        { value: 'Sunshine Weight', ...headerStyle },
      ],
      [
        { value: row.startDate && row.endDate ? `${row.startDate} - ${row.endDate}` : `Week ${week}` },
        { value: row.clients },
        { value: row.adults },
        { value: row.children },
        { value: row.foodWeight },
        { value: row.sunshineBags },
        { value: row.sunshineWeight },
      ],
    ];

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

    const buffer = await writeXlsxFile(rows, {
      sheet: `Pantry ${year}-${month}`,
      buffer: true,
    });
    res
      .setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      .setHeader(
        'Content-Disposition',
        `attachment; filename=${year}_${monthNames[month - 1]}_week${week}_pantry_stats.xlsx`,
      );
    res.send(buffer);
  } catch (error) {
    logger.error('Error exporting pantry weekly:', error);
    next(error);
  }
}

export async function exportPantryMonthly(req: Request, res: Response, next: NextFunction) {
  try {
    const year = parseInt((req.query.year as string) ?? '', 10);
    const month = parseInt((req.query.month as string) ?? '', 10);
    if (!year || !month) return res.status(400).json({ message: 'Year and month required' });
    const result = await pool.query(
      `SELECT clients, adults, children, total_weight as "foodWeight", sunshine_bags as "sunshineBags", sunshine_bag_weight as "sunshineWeight"
         FROM pantry_monthly_overall
        WHERE year = $1 AND month = $2`,
      [year, month],
    );

    const row =
      result.rows[0] || {
        clients: 0,
        adults: 0,
        children: 0,
        foodWeight: 0,
        sunshineBags: 0,
        sunshineWeight: 0,
      };

    const headerStyle = {
      backgroundColor: '#000000',
      color: '#FFFFFF',
      fontWeight: 'bold' as const,
    };

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

    const rows: Row[] = [
      [
        { value: 'Range/Month/Year', ...headerStyle },
        { value: 'Clients', ...headerStyle },
        { value: 'Adults', ...headerStyle },
        { value: 'Children', ...headerStyle },
        { value: 'Food Weight', ...headerStyle },
        { value: 'Sunshine Bags', ...headerStyle },
        { value: 'Sunshine Weight', ...headerStyle },
      ],
      [
        { value: monthNames[month - 1] },
        { value: row.clients },
        { value: row.adults },
        { value: row.children },
        { value: row.foodWeight },
        { value: row.sunshineBags },
        { value: row.sunshineWeight },
      ],
    ];

    const buffer = await writeXlsxFile(rows, {
      sheet: `Pantry ${year}-${month}`,
      buffer: true,
    });
    res
      .setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      .setHeader(
        'Content-Disposition',
        `attachment; filename=${year}_${monthNames[month - 1]}_pantry_stats.xlsx`,
      );
    res.send(buffer);
  } catch (error) {
    logger.error('Error exporting pantry monthly:', error);
    next(error);
  }
}

export async function exportPantryYearly(req: Request, res: Response, next: NextFunction) {
  try {
    const year = parseInt((req.query.year as string) ?? '', 10);
    if (!year) return res.status(400).json({ message: 'Year required' });
    const result = await pool.query(
      `SELECT clients, adults, children, total_weight as "foodWeight", sunshine_bags as "sunshineBags", sunshine_bag_weight as "sunshineWeight"
         FROM pantry_yearly_overall
        WHERE year = $1`,
      [year],
    );

    const row =
      result.rows[0] || {
        clients: 0,
        adults: 0,
        children: 0,
        foodWeight: 0,
        sunshineBags: 0,
        sunshineWeight: 0,
      };

    const headerStyle = {
      backgroundColor: '#000000',
      color: '#FFFFFF',
      fontWeight: 'bold' as const,
    };

    const rows: Row[] = [
      [
        { value: 'Range/Month/Year', ...headerStyle },
        { value: 'Clients', ...headerStyle },
        { value: 'Adults', ...headerStyle },
        { value: 'Children', ...headerStyle },
        { value: 'Food Weight', ...headerStyle },
        { value: 'Sunshine Bags', ...headerStyle },
        { value: 'Sunshine Weight', ...headerStyle },
      ],
      [
        { value: year },
        { value: row.clients },
        { value: row.adults },
        { value: row.children },
        { value: row.foodWeight },
        { value: row.sunshineBags },
        { value: row.sunshineWeight },
      ],
    ];

    const buffer = await writeXlsxFile(rows, {
      sheet: `Pantry ${year}`,
      buffer: true,
    });
    res
      .setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      .setHeader(
        'Content-Disposition',
        `attachment; filename=${year}_pantry_yearly_stats.xlsx`,
      );
    res.send(buffer);
  } catch (error) {
    logger.error('Error exporting pantry yearly:', error);
    next(error);
  }
}


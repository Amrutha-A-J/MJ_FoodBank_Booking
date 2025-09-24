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

export function firstMondayOfMonth(year: number, month: number) {
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const firstMonday = startOfWeek(monthStart);
  if (firstMonday.getUTCMonth() + 1 !== month) {
    firstMonday.setUTCDate(firstMonday.getUTCDate() + 7);
  }
  return firstMonday;
}

const headerStyle = {
  backgroundColor: '#000000',
  color: '#FFFFFF',
  fontWeight: 'bold' as const,
};

export async function refreshPantryWeekly(year: number, month: number, week: number) {
  const firstMonday = firstMondayOfMonth(year, month);
  const start = new Date(firstMonday);
  start.setUTCDate(firstMonday.getUTCDate() + (week - 1) * 7);

  if (start.getUTCMonth() + 1 !== month) return;

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 4);

  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  const [visitsRes, bagRes] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS visits,
              COALESCE(SUM(adults),0)::int AS adults,
              COALESCE(SUM(children),0)::int AS children,
              COALESCE(SUM(weight_without_cart),0)::int AS weight
         FROM client_visits
        WHERE date >= $1 AND date <= $2`,
      [startStr, endStr],
    ),
    pool.query(
      `SELECT COALESCE(SUM(client_count)::int,0) AS orders,
              COALESCE(SUM(weight)::int,0) AS weight
         FROM sunshine_bag_log
        WHERE date >= $1 AND date <= $2`,
      [startStr, endStr],
    ),
  ]);

  const visitOrders = Number(visitsRes.rows[0]?.visits ?? 0);
  const visitAdults = Number(visitsRes.rows[0]?.adults ?? 0);
  const children = Number(visitsRes.rows[0]?.children ?? 0);
  const visitWeight = Number(visitsRes.rows[0]?.weight ?? 0);
  const bagOrders = Number(bagRes.rows[0]?.orders ?? 0);
  const sunshineWeight = Number(bagRes.rows[0]?.weight ?? 0);

  const orders = visitOrders + bagOrders;
  const adults = visitAdults;
  const people = adults + children;
  const weight = visitWeight + sunshineWeight;

  await pool.query(
    `INSERT INTO pantry_weekly_overall (year, month, week, start_date, end_date, orders, adults, children, people, weight)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (year, month, week)
       DO UPDATE SET start_date = EXCLUDED.start_date,
                     end_date = EXCLUDED.end_date,
        orders = EXCLUDED.orders,
        adults = EXCLUDED.adults,
        children = EXCLUDED.children,
        people = EXCLUDED.people,
        weight = EXCLUDED.weight`,
    [
      year,
      month,
      week,
        startStr,
        endStr,
        orders,
        adults,
        children,
        people,
        weight,
    ],
  );
}

export async function refreshPantryMonthly(year: number, month: number) {
  const totalsRes = await pool.query(
    `SELECT COALESCE(SUM(orders),0)::int AS orders,
            COALESCE(SUM(adults),0)::int AS adults,
            COALESCE(SUM(children),0)::int AS children,
            COALESCE(SUM(people),0)::int AS people,
            COALESCE(SUM(weight),0)::int AS weight
       FROM pantry_weekly_overall
      WHERE year = $1 AND month = $2`,
    [year, month],
  );

  const orders = Number(totalsRes.rows[0]?.orders ?? 0);
  const adults = Number(totalsRes.rows[0]?.adults ?? 0);
  const children = Number(totalsRes.rows[0]?.children ?? 0);
  const people = Number(totalsRes.rows[0]?.people ?? 0);
  const weight = Number(totalsRes.rows[0]?.weight ?? 0);

  await pool.query(
    `INSERT INTO pantry_monthly_overall (year, month, orders, adults, children, people, weight)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (year, month)
       DO UPDATE SET orders = EXCLUDED.orders,
                     adults = EXCLUDED.adults,
                     children = EXCLUDED.children,
                     people = EXCLUDED.people,
                     weight = EXCLUDED.weight`,
    [year, month, orders, adults, children, people, weight],
  );
}

export async function refreshPantryYearly(year: number) {
  const totalsRes = await pool.query(
    `SELECT COALESCE(SUM(orders),0)::int AS orders,
            COALESCE(SUM(adults),0)::int AS adults,
            COALESCE(SUM(children),0)::int AS children,
            COALESCE(SUM(people),0)::int AS people,
            COALESCE(SUM(weight),0)::int AS weight
       FROM pantry_weekly_overall
      WHERE year = $1`,
    [year],
  );

  const orders = Number(totalsRes.rows[0]?.orders ?? 0);
  const adults = Number(totalsRes.rows[0]?.adults ?? 0);
  const children = Number(totalsRes.rows[0]?.children ?? 0);
  const people = Number(totalsRes.rows[0]?.people ?? 0);
  const weight = Number(totalsRes.rows[0]?.weight ?? 0);

  await pool.query(
    `INSERT INTO pantry_yearly_overall (year, orders, adults, children, people, weight)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (year)
       DO UPDATE SET orders = EXCLUDED.orders,
                     adults = EXCLUDED.adults,
                     children = EXCLUDED.children,
                     people = EXCLUDED.people,
                     weight = EXCLUDED.weight`,
    [year, orders, adults, children, people, weight],
  );
}

export async function manualPantryAggregate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const year = Number(req.body.year);
    const month = Number(req.body.month);
    if (!year || !month)
      return res.status(400).json({ message: 'Year and month required' });
    const week = Number(req.body.week);
    const orders = Number(req.body.orders) || 0;
    const adults = Number(req.body.adults) || 0;
    const children = Number(req.body.children) || 0;
    const people = Number(req.body.people) || 0;
    const weight = Number(req.body.weight) || 0;

    if (week) {
      const firstMonday = firstMondayOfMonth(year, month);
      const start = new Date(firstMonday);
      start.setUTCDate(firstMonday.getUTCDate() + (week - 1) * 7);
      if (start.getUTCMonth() + 1 !== month)
        return res.status(400).json({ message: 'Invalid week for month' });
      const end = new Date(start);
      end.setUTCDate(start.getUTCDate() + 4);
      const startStr = start.toISOString().slice(0, 10);
      const endStr = end.toISOString().slice(0, 10);

      await pool.query(
        `INSERT INTO pantry_weekly_overall (year, month, week, start_date, end_date, orders, adults, children, people, weight)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (year, month, week)
           DO UPDATE SET start_date = EXCLUDED.start_date,
                         end_date = EXCLUDED.end_date,
                         orders = EXCLUDED.orders,
                         adults = EXCLUDED.adults,
                         children = EXCLUDED.children,
                         people = EXCLUDED.people,
                         weight = EXCLUDED.weight`,
        [year, month, week, startStr, endStr, orders, adults, children, people, weight],
      );

      await refreshPantryMonthly(year, month);
      await refreshPantryYearly(year);
    } else {
      await pool.query(
        `INSERT INTO pantry_monthly_overall (year, month, orders, adults, children, people, weight)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (year, month)
           DO UPDATE SET orders = EXCLUDED.orders,
                         adults = EXCLUDED.adults,
                         children = EXCLUDED.children,
                         people = EXCLUDED.people,
                         weight = EXCLUDED.weight`,
        [year, month, orders, adults, children, people, weight],
      );
    }

    res.json({ message: 'Saved' });
  } catch (error) {
    logger.error('Error inserting pantry manual aggregate:', error);
    next(error);
  }
}

export async function listPantryWeekly(req: Request, res: Response, next: NextFunction) {
  try {
    const year = parseInt((req.query.year as string) ?? '', 10);
    const month = parseInt((req.query.month as string) ?? '', 10);
    if (!year || !month) return res.status(400).json({ message: 'Year and month required' });
    const result = await pool.query(
      `SELECT week, orders, adults, children, people, weight AS "foodWeight"
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
      `SELECT month, orders, adults, children, people, weight AS "foodWeight"
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
      `SELECT year, orders, adults, children, people, weight AS "foodWeight"
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

export async function listAvailableMonths(req: Request, res: Response, next: NextFunction) {
  try {
    const year = parseInt((req.query.year as string) ?? '', 10);
    if (!year) return res.status(400).json({ message: 'Year required' });
    const result = await pool.query(
      `SELECT month, orders, adults, children, people, weight
         FROM pantry_monthly_overall
        WHERE year = $1
        ORDER BY month`,
      [year],
    );
    const months = result.rows
      .filter(
        r =>
          r.orders > 0 ||
          r.adults > 0 ||
          r.children > 0 ||
          r.people > 0 ||
          r.weight > 0 
      )
      .map(r => r.month);
    res.json(months);
  } catch (error) {
    logger.error('Error listing pantry months:', error);
    next(error);
  }
}

export async function listAvailableWeeks(req: Request, res: Response, next: NextFunction) {
  try {
    const year = parseInt((req.query.year as string) ?? '', 10);
    const month = parseInt((req.query.month as string) ?? '', 10);
    if (!year || !month)
      return res.status(400).json({ message: 'Year and month required' });
    const result = await pool.query(
      `SELECT week, orders, adults, children, people, weight
         FROM pantry_weekly_overall
        WHERE year = $1 AND month = $2
        ORDER BY week`,
      [year, month],
    );
    const weeks = result.rows
      .filter(
        r =>
          r.orders > 0 ||
          r.adults > 0 ||
          r.children > 0 ||
          r.people > 0 ||
          r.weight > 0 
      )
      .map(r => r.week);
    res.json(weeks);
  } catch (error) {
    logger.error('Error listing pantry weeks:', error);
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
    await refreshPantryWeekly(year, month, week);
    const result = await pool.query(
      `SELECT start_date AS "startDate", end_date AS "endDate", orders, adults, children, people,
              weight AS "foodWeight"
         FROM pantry_weekly_overall
        WHERE year = $1 AND month = $2 AND week = $3`,
      [year, month, week],
    );

    const row =
      result.rows[0] || {
        startDate: null,
        endDate: null,
        orders: 0,
        adults: 0,
        children: 0,
        people: 0,
        foodWeight: 0,
      };

    let { startDate, endDate } = row;
    if (!startDate || !endDate) {
      const firstMonday = firstMondayOfMonth(year, month);
      const start = new Date(firstMonday);
      start.setUTCDate(firstMonday.getUTCDate() + (week - 1) * 7);
      const end = new Date(start);
      end.setUTCDate(start.getUTCDate() + 4);
      startDate = start.toISOString().slice(0, 10);
      endDate = end.toISOString().slice(0, 10);
    }

    const rows: Row[] = [
      [
        { value: 'Range/Month/Year', ...headerStyle },
        { value: 'Orders', ...headerStyle },
        { value: 'Adults', ...headerStyle },
        { value: 'Children', ...headerStyle },
        { value: 'People', ...headerStyle },
        { value: 'Food Weight', ...headerStyle },
      ],
      [
        { value: startDate && endDate ? `${startDate} - ${endDate}` : `Week ${week}` },
        { value: row.orders },
        { value: row.adults },
        { value: row.children },
        { value: row.people },
        { value: row.foodWeight },
      ],
    ];

    const monthPadded = String(month).padStart(2, '0');

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
        `attachment; filename=${year}_${monthPadded}_${startDate}_to_${endDate}_week_${week}_agggregation.xlsx`,
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
    await refreshPantryMonthly(year, month);
    const result = await pool.query(
      `SELECT orders, adults, children, people, weight AS "foodWeight"
         FROM pantry_monthly_overall
        WHERE year = $1 AND month = $2`,
      [year, month],
    );

    const row =
      result.rows[0] || {
        orders: 0,
        adults: 0,
        children: 0,
        people: 0,
        foodWeight: 0,
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
        { value: 'Orders', ...headerStyle },
        { value: 'Adults', ...headerStyle },
        { value: 'Children', ...headerStyle },
        { value: 'People', ...headerStyle },
        { value: 'Food Weight', ...headerStyle },
      ],
      [
        { value: monthNames[month - 1] },
        { value: row.orders },
        { value: row.adults },
        { value: row.children },
        { value: row.people },
        { value: row.foodWeight },
      ],
    ];

    const monthPadded = String(month).padStart(2, '0');

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
        `attachment; filename=${year}_${monthPadded}_monthly_pantry_aggregation.xlsx`,
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
    await refreshPantryYearly(year);
    const result = await pool.query(
      `SELECT orders, adults, children, people, weight AS "foodWeight"
         FROM pantry_yearly_overall
        WHERE year = $1`,
      [year],
    );

    const row =
      result.rows[0] || {
        orders: 0,
        adults: 0,
        children: 0,
        people: 0,
        foodWeight: 0,
      };

    const rows: Row[] = [
      [
        { value: 'Range/Month/Year', ...headerStyle },
        { value: 'Orders', ...headerStyle },
        { value: 'Adults', ...headerStyle },
        { value: 'Children', ...headerStyle },
        { value: 'People', ...headerStyle },
        { value: 'Food Weight', ...headerStyle },
      ],
      [
        { value: year },
        { value: row.orders },
        { value: row.adults },
        { value: row.children },
        { value: row.people },
        { value: row.foodWeight },
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
        `attachment; filename=${year}_yearly_pantry_aggregation.xlsx`,
      );
    res.send(buffer);
  } catch (error) {
    logger.error('Error exporting pantry yearly:', error);
    next(error);
  }
}


import { Request, Response, NextFunction } from 'express';
import { parse } from 'csv-parse/sync';
import pool from '../db';
import logger from '../utils/logger';
import { sendTemplatedEmail } from '../utils/emailUtils';
import { notifyOps } from '../utils/opsAlert';
import config from '../config';

const MONTH_BUCKETS = ['1-100', '101-500', '501-1000', '1001-10000', '10001-30000'] as const;

type MonthBucket = (typeof MONTH_BUCKETS)[number];

export interface MonetaryDonorMonthlySummary {
  month: string;
  totalAmount: number;
  donationCount: number;
  donorCount: number;
  averageGift: number;
}

export interface MonetaryDonorYtdSummary {
  totalAmount: number;
  donationCount: number;
  donorCount: number;
  averageGift: number;
  averageDonationsPerDonor: number;
  lastDonationISO: string | null;
}

export interface MonetaryDonorTopDonor {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  windowAmount: number;
  lifetimeAmount: number;
  lastDonationISO: string | null;
}

export interface MonetaryDonorTierTallies {
  month: string;
  tiers: Record<MonthBucket, { donorCount: number; totalAmount: number }>;
}

export interface MonetaryDonorFirstTimeDonor {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  firstDonationISO: string;
  amount: number;
}

export interface MonetaryDonorPantryImpact {
  families: number;
  adults: number;
  children: number;
  pounds: number;
}

export interface MonetaryDonorInsightsResponse {
  window: {
    startMonth: string;
    endMonth: string;
    months: number;
  };
  monthly: MonetaryDonorMonthlySummary[];
  ytd: MonetaryDonorYtdSummary;
  topDonors: MonetaryDonorTopDonor[];
  givingTiers: {
    currentMonth: MonetaryDonorTierTallies;
    previousMonth: MonetaryDonorTierTallies;
  };
  firstTimeDonors: MonetaryDonorFirstTimeDonor[];
  pantryImpact: MonetaryDonorPantryImpact;
}

const DEFAULT_MONTHS = 12;
const MIN_MONTHS = 1;
const MAX_MONTHS = 36;

function formatMonth(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function formatDate(date: Date) {
  return `${formatMonth(date)}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function clampMonths(months: number) {
  return Math.min(MAX_MONTHS, Math.max(MIN_MONTHS, months));
}

function initialiseTierTallies(month: string): MonetaryDonorTierTallies {
  const tiers: Record<MonthBucket, { donorCount: number; totalAmount: number }> = {
    '1-100': { donorCount: 0, totalAmount: 0 },
    '101-500': { donorCount: 0, totalAmount: 0 },
    '501-1000': { donorCount: 0, totalAmount: 0 },
    '1001-10000': { donorCount: 0, totalAmount: 0 },
    '10001-30000': { donorCount: 0, totalAmount: 0 },
  };
  return { month, tiers };
}

export async function listDonors(req: Request, res: Response, next: NextFunction) {
  try {
    const search = (req.query.search as string) ?? '';
    const result = await pool.query(
      `SELECT id, first_name AS "firstName", last_name AS "lastName", email
       FROM monetary_donors
       WHERE CONCAT(first_name, ' ', last_name) ILIKE $1 OR email ILIKE $1
       ORDER BY last_name, first_name`,
      [`%${search}%`],
    );
    res.json(result.rows);
  } catch (error) {
    logger.error('Error listing monetary donors:', error);
    next(error);
  }
}

export async function getMonetaryDonorInsights(req: Request, res: Response, next: NextFunction) {
  try {
    let months = DEFAULT_MONTHS;
    if (typeof req.query.months === 'string') {
      const parsedMonths = parseInt(req.query.months, 10);
      if (Number.isNaN(parsedMonths) || parsedMonths < MIN_MONTHS) {
        return res.status(400).json({ message: 'Invalid months parameter' });
      }
      months = clampMonths(parsedMonths);
    }

    let endMonthParam = typeof req.query.endMonth === 'string' ? req.query.endMonth : undefined;
    let endMonthDate: Date;
    if (endMonthParam) {
      if (!/^\d{4}-\d{2}$/.test(endMonthParam)) {
        return res.status(400).json({ message: 'Invalid endMonth parameter' });
      }
      const [yearStr, monthStr] = endMonthParam.split('-');
      const year = Number(yearStr);
      const monthIndex = Number(monthStr) - 1;
      if (Number.isNaN(year) || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
        return res.status(400).json({ message: 'Invalid endMonth parameter' });
      }
      endMonthDate = new Date(Date.UTC(year, monthIndex, 1));
    } else {
      const now = new Date();
      const candidate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      candidate.setUTCMonth(candidate.getUTCMonth() - 1);
      endMonthDate = candidate;
      endMonthParam = formatMonth(candidate);
    }

    const endMonthStart = new Date(endMonthDate);
    const endExclusive = new Date(endMonthDate);
    endExclusive.setUTCMonth(endExclusive.getUTCMonth() + 1);

    const startMonthDate = new Date(endMonthStart);
    startMonthDate.setUTCMonth(startMonthDate.getUTCMonth() - (months - 1));

    const previousMonthStart = new Date(endMonthStart);
    previousMonthStart.setUTCMonth(previousMonthStart.getUTCMonth() - 1);

    const monthlyResult = await pool.query(
      `WITH month_series AS (
         SELECT generate_series($1::date, $2::date, '1 month') AS month_start
       ),
       monthly_donations AS (
         SELECT date_trunc('month', date) AS month_start,
                COUNT(*)::int AS donation_count,
                COUNT(DISTINCT donor_id)::int AS donor_count,
                COALESCE(SUM(amount), 0)::int AS total_amount
           FROM monetary_donations
          WHERE date >= $1 AND date < $3
          GROUP BY 1
       )
       SELECT TO_CHAR(m.month_start, 'YYYY-MM') AS month,
              COALESCE(d.total_amount, 0)::int AS "totalAmount",
              COALESCE(d.donation_count, 0)::int AS "donationCount",
              COALESCE(d.donor_count, 0)::int AS "donorCount",
              COALESCE(ROUND(CASE WHEN d.donation_count > 0 THEN d.total_amount::numeric / d.donation_count ELSE 0 END, 2), 0) AS "averageGift"
         FROM month_series m
         LEFT JOIN monthly_donations d ON d.month_start = m.month_start
        ORDER BY m.month_start`,
      [formatDate(startMonthDate), formatDate(endMonthStart), formatDate(endExclusive)],
    );

    const ytdStart = new Date(Date.UTC(endMonthStart.getUTCFullYear(), 0, 1));
    const ytdResult = await pool.query(
      `WITH ytd AS (
         SELECT COALESCE(SUM(amount), 0)::int AS total_amount,
                COUNT(*)::int AS donation_count,
                COUNT(DISTINCT donor_id)::int AS donor_count
           FROM monetary_donations
          WHERE date >= $1 AND date < $2
       ),
       latest AS (
         SELECT MAX(date) AS last_date
           FROM monetary_donations
       )
       SELECT total_amount AS "totalAmount",
              donation_count AS "donationCount",
              donor_count AS "donorCount",
              COALESCE(ROUND(CASE WHEN donation_count > 0 THEN total_amount::numeric / donation_count ELSE 0 END, 2), 0) AS "averageGift",
              COALESCE(ROUND(CASE WHEN donor_count > 0 THEN donation_count::numeric / donor_count ELSE 0 END, 2), 0) AS "averageDonationsPerDonor",
              TO_CHAR(last_date, 'YYYY-MM-DD') AS "lastDonationISO"
         FROM ytd, latest`,
      [formatDate(ytdStart), formatDate(endExclusive)],
    );

    const topDonorsResult = await pool.query(
      `WITH window_totals AS (
         SELECT donor_id,
                COALESCE(SUM(amount), 0)::int AS window_amount
           FROM monetary_donations
          WHERE date >= $1 AND date < $2
          GROUP BY donor_id
       ),
       lifetime_totals AS (
         SELECT donor_id,
                COALESCE(SUM(amount), 0)::int AS lifetime_amount,
                MAX(date) AS last_donation
           FROM monetary_donations
          GROUP BY donor_id
       )
       SELECT d.id,
              d.first_name AS "firstName",
              d.last_name AS "lastName",
              d.email,
              w.window_amount AS "windowAmount",
              COALESCE(l.lifetime_amount, 0)::int AS "lifetimeAmount",
              TO_CHAR(l.last_donation, 'YYYY-MM-DD') AS "lastDonationISO"
         FROM window_totals w
         JOIN monetary_donors d ON d.id = w.donor_id
         LEFT JOIN lifetime_totals l ON l.donor_id = w.donor_id
        ORDER BY w.window_amount DESC, d.last_name, d.first_name
        LIMIT 5`,
      [formatDate(startMonthDate), formatDate(endExclusive)],
    );

    const tierTalliesResult = await pool.query(
      `WITH month_list AS (
         SELECT generate_series($1::date, $2::date, '1 month') AS month_start
       ),
       tiers AS (
         SELECT unnest(ARRAY['1-100','101-500','501-1000','1001-10000','10001-30000']) AS tier
       ),
       donor_totals AS (
         SELECT date_trunc('month', date) AS month_start,
                donor_id,
                COALESCE(SUM(amount), 0)::int AS total_amount
           FROM monetary_donations
          WHERE date >= $1 AND date < $3
          GROUP BY 1, 2
       ),
       bucketed AS (
         SELECT month_start,
                CASE
                  WHEN total_amount BETWEEN 1 AND 100 THEN '1-100'
                  WHEN total_amount BETWEEN 101 AND 500 THEN '101-500'
                  WHEN total_amount BETWEEN 501 AND 1000 THEN '501-1000'
                  WHEN total_amount BETWEEN 1001 AND 10000 THEN '1001-10000'
                  WHEN total_amount >= 10001 THEN '10001-30000'
                  ELSE NULL
                END AS tier,
                total_amount
           FROM donor_totals
       )
       SELECT TO_CHAR(m.month_start, 'YYYY-MM') AS month,
              t.tier,
              COALESCE(COUNT(b.total_amount), 0)::int AS "donorCount",
              COALESCE(SUM(b.total_amount), 0)::int AS "totalAmount"
         FROM month_list m
         CROSS JOIN tiers t
         LEFT JOIN bucketed b ON b.month_start = m.month_start AND b.tier = t.tier
        GROUP BY m.month_start, t.tier
        ORDER BY m.month_start, t.tier`,
      [formatDate(previousMonthStart), formatDate(endMonthStart), formatDate(endExclusive)],
    );

    const firstTimeDonorsResult = await pool.query(
      `WITH first_donation AS (
         SELECT DISTINCT ON (donor_id)
                donor_id,
                date,
                amount
           FROM monetary_donations
          ORDER BY donor_id, date, id
       )
       SELECT d.id,
              d.first_name AS "firstName",
              d.last_name AS "lastName",
              d.email,
              TO_CHAR(f.date, 'YYYY-MM-DD') AS "firstDonationISO",
              f.amount::int AS amount
         FROM first_donation f
         JOIN monetary_donors d ON d.id = f.donor_id
        WHERE f.date >= $1 AND f.date < $2
        ORDER BY f.date, d.last_name, d.first_name`,
      [formatDate(endMonthStart), formatDate(endExclusive)],
    );

    const pantryImpactResult = await pool.query(
      `SELECT COALESCE(orders, 0)::int AS families,
              COALESCE(adults, 0)::int AS adults,
              COALESCE(children, 0)::int AS children,
              COALESCE(weight, 0)::int AS pounds
         FROM pantry_monthly_overall
        WHERE year = $1 AND month = $2`,
      [endMonthStart.getUTCFullYear(), endMonthStart.getUTCMonth() + 1],
    );

    const monthly: MonetaryDonorMonthlySummary[] = monthlyResult.rows.map(row => ({
      month: row.month,
      totalAmount: Number(row.totalAmount ?? 0),
      donationCount: Number(row.donationCount ?? 0),
      donorCount: Number(row.donorCount ?? 0),
      averageGift: Number(row.averageGift ?? 0),
    }));

    const ytdRow = ytdResult.rows[0] ?? {};
    const ytd: MonetaryDonorYtdSummary = {
      totalAmount: Number(ytdRow.totalAmount ?? 0),
      donationCount: Number(ytdRow.donationCount ?? 0),
      donorCount: Number(ytdRow.donorCount ?? 0),
      averageGift: Number(ytdRow.averageGift ?? 0),
      averageDonationsPerDonor: Number(ytdRow.averageDonationsPerDonor ?? 0),
      lastDonationISO: ytdRow.lastDonationISO ?? null,
    };

    const topDonors: MonetaryDonorTopDonor[] = topDonorsResult.rows.map(row => ({
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      windowAmount: Number(row.windowAmount ?? 0),
      lifetimeAmount: Number(row.lifetimeAmount ?? 0),
      lastDonationISO: row.lastDonationISO ?? null,
    }));

    const tierTalliesMap = new Map<string, MonetaryDonorTierTallies>();
    for (const row of tierTalliesResult.rows) {
      const month = row.month as string;
      const tier = row.tier as MonthBucket;
      let monthTallies = tierTalliesMap.get(month);
      if (!monthTallies) {
        monthTallies = initialiseTierTallies(month);
        tierTalliesMap.set(month, monthTallies);
      }
      if (tier) {
        monthTallies.tiers[tier] = {
          donorCount: Number(row.donorCount ?? 0),
          totalAmount: Number(row.totalAmount ?? 0),
        };
      }
    }

    const currentMonthTallies = tierTalliesMap.get(formatMonth(endMonthStart)) ?? initialiseTierTallies(formatMonth(endMonthStart));
    const previousMonthTallies = tierTalliesMap.get(formatMonth(previousMonthStart)) ?? initialiseTierTallies(formatMonth(previousMonthStart));

    const firstTimeDonors: MonetaryDonorFirstTimeDonor[] = firstTimeDonorsResult.rows.map(row => ({
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      firstDonationISO: row.firstDonationISO,
      amount: Number(row.amount ?? 0),
    }));

    const pantryImpactRow = pantryImpactResult.rows[0] ?? {};
    const pantryImpact: MonetaryDonorPantryImpact = {
      families: Number(pantryImpactRow?.families ?? 0),
      adults: Number(pantryImpactRow?.adults ?? 0),
      children: Number(pantryImpactRow?.children ?? 0),
      pounds: Number(pantryImpactRow?.pounds ?? 0),
    };

    const response: MonetaryDonorInsightsResponse = {
      window: {
        startMonth: formatMonth(startMonthDate),
        endMonth: formatMonth(endMonthStart),
        months,
      },
      monthly,
      ytd,
      topDonors,
      givingTiers: {
        currentMonth: currentMonthTallies,
        previousMonth: previousMonthTallies,
      },
      firstTimeDonors,
      pantryImpact,
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching monetary donor insights:', error);
    next(error);
  }
}

export async function addDonor(req: Request, res: Response, next: NextFunction) {
  try {
    const { firstName, lastName, email } = req.body;
    const result = await pool.query(
      `INSERT INTO monetary_donors (first_name, last_name, email)
       VALUES ($1, $2, $3)
       RETURNING id, first_name AS "firstName", last_name AS "lastName", email`,
      [firstName, lastName, email],
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Donor already exists' });
    }
    logger.error('Error adding monetary donor:', error);
    next(error);
  }
}

export async function updateDonor(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { firstName, lastName, email } = req.body;
    const result = await pool.query(
      `UPDATE monetary_donors
       SET first_name = $1, last_name = $2, email = $3
       WHERE id = $4
       RETURNING id, first_name AS "firstName", last_name AS "lastName", email`,
      [firstName, lastName, email, id],
    );
    if ((result.rowCount ?? 0) === 0) return res.status(404).json({ message: 'Donor not found' });
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating monetary donor:', error);
    next(error);
  }
}

export async function deleteDonor(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM monetary_donors WHERE id = $1', [id]);
    res.status(204).end();
  } catch (error) {
    logger.error('Error deleting monetary donor:', error);
    next(error);
  }
}

export async function getDonor(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT d.id, d.first_name AS "firstName", d.last_name AS "lastName", d.email,
              COALESCE(SUM(n.amount), 0)::int AS amount,
              TO_CHAR(MAX(n.date), 'YYYY-MM-DD') AS "lastDonationISO"
       FROM monetary_donors d
       LEFT JOIN monetary_donations n ON n.donor_id = d.id
       WHERE d.id = $1
       GROUP BY d.id, d.first_name, d.last_name, d.email`,
      [id],
    );
    if ((result.rowCount ?? 0) === 0) return res.status(404).json({ message: 'Donor not found' });
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error fetching monetary donor:', error);
    next(error);
  }
}

export async function listDonations(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, date, amount FROM monetary_donations WHERE donor_id = $1 ORDER BY date DESC, id DESC',
      [id],
    );
    res.json(result.rows);
  } catch (error) {
    logger.error('Error listing monetary donations:', error);
    next(error);
  }
}

export async function addDonation(req: Request, res: Response, next: NextFunction) {
  try {
    const donorId = parseInt(req.params.id, 10);
    const { date, amount } = req.body;
    const result = await pool.query(
      `INSERT INTO monetary_donations (donor_id, date, amount)
       VALUES ($1, $2, $3)
       RETURNING id, donor_id AS "donorId", date, amount`,
      [donorId, date, amount],
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    logger.error('Error adding monetary donation:', error);
    next(error);
  }
}

export async function updateDonation(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { donorId, date, amount } = req.body;
    const result = await pool.query(
      `UPDATE monetary_donations
       SET donor_id = $1, date = $2, amount = $3
       WHERE id = $4
       RETURNING id, donor_id AS "donorId", date, amount`,
      [donorId, date, amount, id],
    );
    if ((result.rowCount ?? 0) === 0) return res.status(404).json({ message: 'Donation not found' });
    res.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating monetary donation:', error);
    next(error);
  }
}

export async function deleteDonation(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM monetary_donations WHERE id = $1', [id]);
    res.status(204).end();
  } catch (error) {
    logger.error('Error deleting monetary donation:', error);
    next(error);
  }
}

export async function getMailLists(req: Request, res: Response, next: NextFunction) {
  try {
    const now = new Date();
    let year = parseInt((req.query.year as string) ?? '', 10);
    let month = parseInt((req.query.month as string) ?? '', 10);
    if (Number.isNaN(year) || Number.isNaN(month)) {
      now.setUTCMonth(now.getUTCMonth() - 1);
      year = now.getUTCFullYear();
      month = now.getUTCMonth() + 1;
    }
    const startDate = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
    const endDate = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);

    const donorsRes = await pool.query(
      `SELECT d.id, d.first_name AS "firstName", d.last_name AS "lastName", d.email,
              COALESCE(SUM(n.amount), 0)::int AS amount
       FROM monetary_donations n
       JOIN monetary_donors d ON n.donor_id = d.id
       WHERE n.date >= $1 AND n.date < $2 AND d.email IS NOT NULL
       GROUP BY d.id, d.first_name, d.last_name, d.email`,
      [startDate, endDate],
    );

    const groups: Record<string, any[]> = {
      '1-100': [],
      '101-500': [],
      '501-1000': [],
      '1001-10000': [],
      '10001-30000': [],
    };
    for (const row of donorsRes.rows) {
      if (row.amount <= 100) groups['1-100'].push(row);
      else if (row.amount <= 500) groups['101-500'].push(row);
      else if (row.amount <= 1000) groups['501-1000'].push(row);
      else if (row.amount <= 10000) groups['1001-10000'].push(row);
      else groups['10001-30000'].push(row);
    }

    res.json(groups);
  } catch (error) {
    logger.error('Error generating monetary donor mail lists:', error);
    next(error);
  }
}

export async function sendMailLists(req: Request, res: Response, next: NextFunction) {
  try {
    const now = new Date();
    let year = parseInt((req.body.year as string) ?? '', 10);
    let month = parseInt((req.body.month as string) ?? '', 10);
    if (Number.isNaN(year) || Number.isNaN(month)) {
      now.setUTCMonth(now.getUTCMonth() - 1);
      year = now.getUTCFullYear();
      month = now.getUTCMonth() + 1;
    }

    const startDate = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10);
    const endDate = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);

    const donorsRes = await pool.query(
      `SELECT d.id, d.first_name, d.email, COALESCE(SUM(n.amount), 0)::int AS amount
       FROM monetary_donations n
       JOIN monetary_donors d ON n.donor_id = d.id
       LEFT JOIN monetary_donor_mail_log m
         ON m.donor_id = d.id AND m.year = $3 AND m.month = $4
       WHERE n.date >= $1 AND n.date < $2 AND d.email IS NOT NULL AND m.id IS NULL
       GROUP BY d.id, d.first_name, d.email`,
      [startDate, endDate, year, month],
    );

    const statsRes = await pool.query(
      `SELECT orders AS families,
              adults,
              children,
              weight AS pounds
         FROM pantry_monthly_overall
        WHERE year = $1 AND month = $2`,
      [year, month],
    );
    const { families = 0, adults = 0, children = 0, pounds = 0 } =
      statsRes.rows[0] || {};

    const groups: Record<string, any[]> = {
      '1-100': [],
      '101-500': [],
      '501-1000': [],
      '1001-10000': [],
      '10001-30000': [],
    };
    for (const row of donorsRes.rows) {
      if (row.amount <= 100) groups['1-100'].push(row);
      else if (row.amount <= 500) groups['101-500'].push(row);
      else if (row.amount <= 1000) groups['501-1000'].push(row);
      else if (row.amount <= 10000) groups['1001-10000'].push(row);
      else groups['10001-30000'].push(row);
    }

    const templateMap: Record<string, number> = {
      '1-100': config.donorTemplateId1To100,
      '101-500': config.donorTemplateId101To500,
      '501-1000': config.donorTemplateId501To1000,
      '1001-10000': config.donorTemplateId1001To10000,
      '10001-30000': config.donorTemplateId10001To30000,
    };
    const monthName = new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-CA', {
      month: 'long',
      timeZone: 'UTC',
    });
    let sent = 0;
    for (const [range, donors] of Object.entries(groups)) {
      if (donors.length === 0) continue;
      const templateId = templateMap[range];
      const emails: string[] = [];
      for (const donor of donors) {
        await sendTemplatedEmail({
          to: donor.email,
          templateId,
          params: {
            firstName: donor.first_name,
            amount: donor.amount,
            families,
            adults,
            children,
            pounds,
            month: monthName,
            year,
          },
        });
        await pool.query(
          `INSERT INTO monetary_donor_mail_log (donor_id, year, month)
           VALUES ($1, $2, $3)
           ON CONFLICT (donor_id, year, month) DO NOTHING`,
          [donor.id, year, month],
        );
        sent++;
        emails.push(donor.email);
      }
      await notifyOps(`Monetary donor emails sent for ${range}: ${emails.join(', ')}`);
    }

    res.json({ sent });
  } catch (error) {
    logger.error('Error sending monetary donor mails:', error);
    next(error);
  }
}

export async function listTestEmails(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await pool.query(
      'SELECT id, email FROM donor_test_emails ORDER BY id',
    );
    res.json(result.rows);
  } catch (error) {
    logger.error('Error listing donor test emails:', error);
    next(error);
  }
}

export async function addTestEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    const result = await pool.query(
      'INSERT INTO donor_test_emails (email) VALUES ($1) RETURNING id, email',
      [email],
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Email already exists' });
    }
    logger.error('Error adding donor test email:', error);
    next(error);
  }
}

export async function updateTestEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.body;
    const id = req.params.id;
    const result = await pool.query(
      'UPDATE donor_test_emails SET email = $1 WHERE id = $2 RETURNING id, email',
      [email, id],
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Not found' });
    res.json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'Email already exists' });
    }
    logger.error('Error updating donor test email:', error);
    next(error);
  }
}

export async function deleteTestEmail(req: Request, res: Response, next: NextFunction) {
  try {
    await pool.query('DELETE FROM donor_test_emails WHERE id = $1', [req.params.id]);
    res.status(204).end();
  } catch (error) {
    logger.error('Error deleting donor test email:', error);
    next(error);
  }
}

export async function sendTestMailLists(req: Request, res: Response, next: NextFunction) {
  try {
    const now = new Date();
    let year = parseInt((req.body.year as string) ?? '', 10);
    let month = parseInt((req.body.month as string) ?? '', 10);
    if (Number.isNaN(year) || Number.isNaN(month)) {
      now.setUTCMonth(now.getUTCMonth() - 1);
      year = now.getUTCFullYear();
      month = now.getUTCMonth() + 1;
    }

    const statsRes = await pool.query(
      `SELECT orders AS families,
              adults,
              children,
              weight AS pounds
         FROM pantry_monthly_overall
        WHERE year = $1 AND month = $2`,
      [year, month],
    );
    const { families = 0, adults = 0, children = 0, pounds = 0 } =
      statsRes.rows[0] || {};

    const emailsRes = await pool.query(
      'SELECT email FROM donor_test_emails WHERE email IS NOT NULL ORDER BY id',
    );
    const testEmails = emailsRes.rows.map(r => r.email);

    const ranges: Record<string, { min: number; max: number; templateId: number }> = {
      '1-100': { min: 1, max: 100, templateId: config.donorTemplateId1To100 },
      '101-500': { min: 101, max: 500, templateId: config.donorTemplateId101To500 },
      '501-1000': { min: 501, max: 1000, templateId: config.donorTemplateId501To1000 },
      '1001-10000': { min: 1001, max: 10000, templateId: config.donorTemplateId1001To10000 },
      '10001-30000': { min: 10001, max: 30000, templateId: config.donorTemplateId10001To30000 },
    };

    const monthName = new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-CA', {
      month: 'long',
      timeZone: 'UTC',
    });
    let sent = 0;
    for (const [range, info] of Object.entries(ranges)) {
      const sentEmails: string[] = [];
      for (const email of testEmails) {
        const amount =
          Math.floor(Math.random() * (info.max - info.min + 1)) + info.min;
        await sendTemplatedEmail({
          to: email,
          templateId: info.templateId,
          params: {
            firstName: 'Test',
            amount,
            families,
            adults,
            children,
            pounds,
            month: monthName,
            year,
          },
        });
        sent++;
        sentEmails.push(email);
      }
      if (sentEmails.length > 0) {
        await notifyOps(`Test monetary donor emails sent for ${range}: ${sentEmails.join(', ')}`);
      }
    }

    res.json({ sent });
  } catch (error) {
    logger.error('Error sending test monetary donor mails:', error);
    next(error);
  }
}

export async function importZeffyDonations(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) return res.status(400).json({ message: 'File required' });

    const records = parse(req.file.buffer.toString('utf8'), {
      columns: true,
      skip_empty_lines: true,
    });

    let donorsAdded = 0;
    let donationsImported = 0;

    for (const row of records) {
      if (row['Payment Status'] !== 'Succeeded') continue;

      const firstName = (row['First Name'] ?? '').trim();
      const lastName = (row['Last Name'] ?? '').trim();
      const email = (row['Email'] ?? '').trim() || null;

      let donorId: number;
      if (email) {
        const existing = await pool.query('SELECT id FROM monetary_donors WHERE email = $1', [email]);
        if (existing.rowCount) {
          donorId = existing.rows[0].id;
        } else {
          const insert = await pool.query(
            `INSERT INTO monetary_donors (first_name, last_name, email)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [firstName, lastName, email],
          );
          donorId = insert.rows[0].id;
          donorsAdded++;
        }
      } else {
        const existing = await pool.query(
          'SELECT id FROM monetary_donors WHERE first_name = $1 AND last_name = $2 AND email IS NULL',
          [firstName, lastName],
        );
        if (existing.rowCount) {
          donorId = existing.rows[0].id;
        } else {
          const insert = await pool.query(
            `INSERT INTO monetary_donors (first_name, last_name, email)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [firstName, lastName, null],
          );
          donorId = insert.rows[0].id;
          donorsAdded++;
        }
      }

      const date = new Date(row['Payment Date']);
      const dateStr = date.toLocaleDateString('en-CA', { timeZone: 'America/Regina' });
      const amount = Math.round(
        parseFloat((row['Total Amount'] ?? '0').replace(/[^0-9.-]/g, '')) * 100,
      );

      await pool.query(
        `INSERT INTO monetary_donations (donor_id, date, amount)
         VALUES ($1, $2, $3)`,
        [donorId, dateStr, amount],
      );
      donationsImported++;
    }

    res.json({ donorsAdded, donationsImported });
  } catch (error) {
    logger.error('Error importing Zeffy donations:', error);
    next(error);
  }
}

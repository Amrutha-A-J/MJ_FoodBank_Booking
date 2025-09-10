import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import logger from '../utils/logger';
import { sendTemplatedEmail } from '../utils/emailUtils';
import config from '../config';

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
       WHERE n.date >= $1 AND n.date < $2
       GROUP BY d.id, d.first_name, d.last_name, d.email`,
      [startDate, endDate],
    );

    const groups: Record<string, any[]> = { '1-100': [], '101-500': [], '501+': [] };
    for (const row of donorsRes.rows) {
      if (row.amount <= 100) groups['1-100'].push(row);
      else if (row.amount <= 500) groups['101-500'].push(row);
      else groups['501+'].push(row);
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
      `SELECT d.first_name, d.email, COALESCE(SUM(n.amount), 0)::int AS amount
       FROM monetary_donations n
       JOIN monetary_donors d ON n.donor_id = d.id
       WHERE n.date >= $1 AND n.date < $2
       GROUP BY d.id, d.first_name, d.email`,
      [startDate, endDate],
    );

    const statsRes = await pool.query(
      `SELECT orders AS families,
              children,
              weight AS pounds
         FROM pantry_monthly_overall
        WHERE year = $1 AND month = $2`,
      [year, month],
    );
    const { families = 0, children = 0, pounds = 0 } = statsRes.rows[0] || {};

    const groups: Record<string, any[]> = { '1-100': [], '101-500': [], '501+': [] };
    for (const row of donorsRes.rows) {
      if (row.amount <= 100) groups['1-100'].push(row);
      else if (row.amount <= 500) groups['101-500'].push(row);
      else groups['501+'].push(row);
    }

    const templateMap: Record<string, number> = {
      '1-100': config.donorTemplateId1To100,
      '101-500': config.donorTemplateId101To500,
      '501+': config.donorTemplateId501Plus,
    };
    const monthName = new Date(Date.UTC(year, month - 1)).toLocaleString('en-CA', {
      month: 'long',
    });
    let sent = 0;
    for (const [range, donors] of Object.entries(groups)) {
      if (donors.length === 0) continue;
      const templateId = templateMap[range];
      for (const donor of donors) {
        await sendTemplatedEmail({
          to: donor.email,
          templateId,
          params: {
            firstName: donor.first_name,
            amount: donor.amount,
            families,
            children,
            pounds,
            month: monthName,
            year,
          },
        });
        sent++;
      }
    }

    res.json({ sent });
  } catch (error) {
    logger.error('Error sending monetary donor mails:', error);
    next(error);
  }
}

import { Request, Response, NextFunction } from 'express';
import pool from '../db';
import logger from '../utils/logger';
import { sendTemplatedEmail } from '../utils/emailUtils';

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
    const year = parseInt((req.query.year as string) ?? '', 10) || now.getUTCFullYear();
    const month = parseInt((req.query.month as string) ?? '', 10) || now.getUTCMonth() + 1;
    const donorsRes = await pool.query(
      `SELECT d.id, d.first_name AS "firstName", d.last_name AS "lastName", d.email,
              COALESCE(SUM(n.amount), 0)::int AS amount
       FROM monetary_donations n
       JOIN monetary_donors d ON n.donor_id = d.id
       WHERE EXTRACT(YEAR FROM n.date) = $1 AND EXTRACT(MONTH FROM n.date) = $2
       GROUP BY d.id, d.first_name, d.last_name, d.email`,
      [year, month],
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
    const year = parseInt((req.body.year as string) ?? '', 10) || now.getUTCFullYear();
    const month = parseInt((req.body.month as string) ?? '', 10) || now.getUTCMonth() + 1;

    const donorsRes = await pool.query(
      `SELECT d.first_name, d.email, COALESCE(SUM(n.amount), 0)::int AS amount
       FROM monetary_donations n
       JOIN monetary_donors d ON n.donor_id = d.id
       WHERE EXTRACT(YEAR FROM n.date) = $1 AND EXTRACT(MONTH FROM n.date) = $2
       GROUP BY d.id, d.first_name, d.email`,
      [year, month],
    );

    const statsRes = await pool.query(
      `SELECT COALESCE(SUM(adults),0)::int AS adults,
              COALESCE(SUM(children),0)::int AS children,
              COALESCE(SUM(COALESCE(weight_without_cart, weight_with_cart)),0)::int AS pounds
       FROM client_visits
       WHERE EXTRACT(YEAR FROM date) = $1 AND EXTRACT(MONTH FROM date) = $2`,
      [year, month],
    );
    const { adults, children, pounds } = statsRes.rows[0];

    for (const donor of donorsRes.rows) {
      const templateId = donor.amount <= 100 ? 11 : 12;
      await sendTemplatedEmail({
        to: donor.email,
        templateId,
        params: {
          firstName: donor.first_name,
          adults,
          children,
          pounds,
          amount: donor.amount,
        },
      });
    }

    res.json({ sent: donorsRes.rowCount });
  } catch (error) {
    logger.error('Error sending monetary donor mails:', error);
    next(error);
  }
}

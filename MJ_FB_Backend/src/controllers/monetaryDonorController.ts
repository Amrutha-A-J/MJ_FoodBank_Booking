import { Request, Response, NextFunction } from 'express';
import { parse } from 'csv-parse/sync';
import pool from '../db';
import logger from '../utils/logger';
import { sendTemplatedEmail } from '../utils/emailUtils';
import { notifyOps } from '../utils/opsAlert';
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
    const monthName = new Date(Date.UTC(year, month - 1)).toLocaleString('en-CA', {
      month: 'long',
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

    const monthName = new Date(Date.UTC(year, month - 1)).toLocaleString('en-CA', {
      month: 'long',
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

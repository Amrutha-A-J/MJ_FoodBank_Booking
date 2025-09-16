// src/routes/holidays.ts
import express from 'express';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import pool from '../db';
import { formatReginaDate } from '../utils/dateUtils';
import { getHolidays, refreshHolidays } from '../utils/holidayCache';

const router = express.Router();

router.get(
  '/',
  authMiddleware,
  authorizeRoles('staff', 'volunteer', 'user'),
  async (_, res) => {
    const holidays = await getHolidays();
    res.json(holidays);
  },
);

router.post(
  '/',
  authMiddleware,
  authorizeRoles('staff'),
  async (req, res) => {
    const { date, reason } = req.body;
    if (!date) return res.status(400).json({ message: 'Date required' });
    const reginaDate = formatReginaDate(date);
    await pool.query(
      'INSERT INTO holidays (date, reason) VALUES ($1, $2) ON CONFLICT (date) DO UPDATE SET reason = EXCLUDED.reason',
      [reginaDate, reason ?? null],
    );
    await refreshHolidays();
    res.json({ message: 'Added' });
  },
);

router.delete(
  '/:date',
  authMiddleware,
  authorizeRoles('staff'),
  async (req, res) => {
    const reginaDate = formatReginaDate(req.params.date);
    await pool.query('DELETE FROM holidays WHERE date = $1', [reginaDate]);
    await refreshHolidays();
    res.json({ message: 'Removed' });
  },
);

export default router;

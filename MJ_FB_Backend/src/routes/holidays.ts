// src/routes/holidays.ts
import express from 'express';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import pool from '../db';

const router = express.Router();

router.get(
  '/',
  authMiddleware,
  authorizeRoles('staff', 'volunteer', 'user'),
  async (_, res) => {
    const result = await pool.query('SELECT date, reason FROM holidays ORDER BY date');
    res.json(
      result.rows.map(r => ({
        date: r.date.toISOString().split('T')[0],
        reason: r.reason ?? '',
      }))
    );
  },
);

router.post(
  '/',
  authMiddleware,
  authorizeRoles('staff'),
  async (req, res) => {
    const { date, reason } = req.body;
    if (!date) return res.status(400).json({ message: 'Date required' });
    await pool.query(
      'INSERT INTO holidays (date, reason) VALUES ($1, $2) ON CONFLICT (date) DO UPDATE SET reason = EXCLUDED.reason',
      [date, reason ?? null]
    );
    res.json({ message: 'Added' });
  },
);

router.delete(
  '/:date',
  authMiddleware,
  authorizeRoles('staff'),
  async (req, res) => {
    await pool.query('DELETE FROM holidays WHERE date = $1', [req.params.date]);
    res.json({ message: 'Removed' });
  },
);

export default router;

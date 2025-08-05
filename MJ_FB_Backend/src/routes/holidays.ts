// src/routes/holidays.ts
import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import pool from '../db';

const router = express.Router();

async function ensureTable() {
  await pool.query(
    'CREATE TABLE IF NOT EXISTS holidays (date DATE PRIMARY KEY, reason TEXT)'
  );
  await pool.query('ALTER TABLE holidays ADD COLUMN IF NOT EXISTS reason TEXT');
}

router.get('/', authMiddleware, async (_, res) => {
  await ensureTable();
  const result = await pool.query('SELECT date, reason FROM holidays ORDER BY date');
  res.json(
    result.rows.map(r => ({
      date: r.date.toISOString().split('T')[0],
      reason: r.reason ?? '',
    }))
  );
});

router.post('/', authMiddleware, async (req, res) => {
  const { date, reason } = req.body;
  if (!date) return res.status(400).json({ message: 'Date required' });
  await ensureTable();
  await pool.query(
    'INSERT INTO holidays (date, reason) VALUES ($1, $2) ON CONFLICT (date) DO UPDATE SET reason = EXCLUDED.reason',
    [date, reason ?? null]
  );
  res.json({ message: 'Added' });
});

router.delete('/:date', authMiddleware, async (req, res) => {
  await ensureTable();
  await pool.query('DELETE FROM holidays WHERE date = $1', [req.params.date]);
  res.json({ message: 'Removed' });
});

export default router;

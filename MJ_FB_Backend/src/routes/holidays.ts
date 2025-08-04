// src/routes/holidays.ts
import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import pool from '../db';

const router = express.Router();

router.get('/', authMiddleware, async (_, res) => {
  const result = await pool.query('SELECT date FROM holidays ORDER BY date');
  res.json(result.rows.map(r => r.date.toISOString().split('T')[0]));
});

router.post('/', authMiddleware, async (req, res) => {
  const { date } = req.body;
  if (!date) return res.status(400).json({ message: 'Date required' });
  await pool.query('INSERT INTO holidays (date) VALUES ($1) ON CONFLICT DO NOTHING', [date]);
  res.json({ message: 'Added' });
});

router.delete('/:date', authMiddleware, async (req, res) => {
  await pool.query('DELETE FROM holidays WHERE date = $1', [req.params.date]);
  res.json({ message: 'Removed' });
});

export default router;

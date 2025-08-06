import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import pool from '../db';

const router = express.Router();

async function ensureTable() {
  await pool.query(
    'CREATE TABLE IF NOT EXISTS breaks (day_of_week INTEGER NOT NULL, slot_id INTEGER NOT NULL, reason TEXT, PRIMARY KEY (day_of_week, slot_id), FOREIGN KEY (slot_id) REFERENCES slots(id))'
  );
  await pool.query('ALTER TABLE breaks ADD COLUMN IF NOT EXISTS reason TEXT');
}

router.get('/', authMiddleware, async (_, res) => {
  await ensureTable();
  const result = await pool.query('SELECT day_of_week, slot_id, reason FROM breaks');
  res.json(
    result.rows.map(r => ({
      dayOfWeek: Number(r.day_of_week),
      slotId: Number(r.slot_id),
      reason: r.reason ?? '',
    }))
  );
});

router.post('/', authMiddleware, async (req, res) => {
  const { dayOfWeek, slotId, reason } = req.body;
  if (dayOfWeek === undefined || slotId === undefined) {
    return res.status(400).json({ message: 'dayOfWeek and slotId required' });
  }
  await ensureTable();
  await pool.query(
    'INSERT INTO breaks (day_of_week, slot_id, reason) VALUES ($1, $2, $3) ON CONFLICT (day_of_week, slot_id) DO UPDATE SET reason = EXCLUDED.reason',
    [dayOfWeek, slotId, reason ?? null]
  );
  res.json({ message: 'Added' });
});

router.delete('/:day/:slotId', authMiddleware, async (req, res) => {
  const { day, slotId } = req.params;
  await ensureTable();
  await pool.query('DELETE FROM breaks WHERE day_of_week = $1 AND slot_id = $2', [day, slotId]);
  res.json({ message: 'Removed' });
});

export default router;


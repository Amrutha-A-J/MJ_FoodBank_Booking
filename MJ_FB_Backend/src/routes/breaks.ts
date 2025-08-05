import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import pool from '../db';

const router = express.Router();

async function ensureTable() {
  await pool.query(
    'CREATE TABLE IF NOT EXISTS breaks (day_of_week INTEGER NOT NULL, slot_id INTEGER NOT NULL, PRIMARY KEY (day_of_week, slot_id))'
  );
}

router.get('/', authMiddleware, async (_, res) => {
  await ensureTable();
  const result = await pool.query('SELECT day_of_week, slot_id FROM breaks');
  res.json(result.rows.map(r => ({ dayOfWeek: Number(r.day_of_week), slotId: Number(r.slot_id) })));
});

router.post('/', authMiddleware, async (req, res) => {
  const { dayOfWeek, slotId } = req.body;
  if (dayOfWeek === undefined || slotId === undefined) {
    return res.status(400).json({ message: 'dayOfWeek and slotId required' });
  }
  await ensureTable();
  await pool.query(
    'INSERT INTO breaks (day_of_week, slot_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [dayOfWeek, slotId]
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


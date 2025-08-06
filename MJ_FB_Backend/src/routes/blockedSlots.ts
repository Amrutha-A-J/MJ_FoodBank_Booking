import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import pool from '../db';

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  const date = req.query.date as string;
  if (!date) return res.status(400).json({ message: 'Date required' });
  const result = await pool.query('SELECT slot_id, reason FROM blocked_slots WHERE date = $1', [date]);
  res.json(result.rows.map(r => ({ slotId: Number(r.slot_id), reason: r.reason ?? '' })));
});

router.post('/', authMiddleware, async (req, res) => {
  const { date, slotId, reason } = req.body;
  if (!date || !slotId) return res.status(400).json({ message: 'Date and slotId required' });
  await pool.query(
    'INSERT INTO blocked_slots (date, slot_id, reason) VALUES ($1, $2, $3) ON CONFLICT (date, slot_id) DO UPDATE SET reason = EXCLUDED.reason',
    [date, slotId, reason ?? null]
  );
  res.json({ message: 'Added' });
});

router.delete('/:date/:slotId', authMiddleware, async (req, res) => {
  const { date, slotId } = req.params;
  await pool.query('DELETE FROM blocked_slots WHERE date = $1 AND slot_id = $2', [date, slotId]);
  res.json({ message: 'Removed' });
});

export default router;


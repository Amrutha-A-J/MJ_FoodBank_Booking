import express from 'express';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import pool from '../db';
import { validate, validateParams } from '../middleware/validate';
import {
  addBlockedSlotSchema,
  deleteBlockedSlotParamsSchema,
} from '../schemas/blockedSlotSchemas';

const router = express.Router();

router.get(
  '/',
  authMiddleware,
  authorizeRoles('staff'),
  async (req, res) => {
    const date = req.query.date as string;
    if (!date) return res.status(400).json({ message: 'Date required' });
    const result = await pool.query('SELECT slot_id, reason FROM blocked_slots WHERE date = $1', [date]);
    res.json(result.rows.map(r => ({ slotId: Number(r.slot_id), reason: r.reason ?? '' })));
  },
);

router.post(
  '/',
  authMiddleware,
  authorizeRoles('staff'),
  validate(addBlockedSlotSchema),
  async (req, res) => {
    const { date, slotId, reason } = req.body;
    await pool.query(
      'INSERT INTO blocked_slots (date, slot_id, reason) VALUES ($1, $2, $3) ON CONFLICT (date, slot_id) DO UPDATE SET reason = EXCLUDED.reason',
      [date, slotId, reason ?? null]
    );
    res.json({ message: 'Added' });
  },
);

router.delete(
  '/:date/:slotId',
  authMiddleware,
  authorizeRoles('staff'),
  validateParams(deleteBlockedSlotParamsSchema),
  async (req, res) => {
    const { date, slotId } = req.params;
    await pool.query('DELETE FROM blocked_slots WHERE date = $1 AND slot_id = $2', [date, slotId]);
    res.json({ message: 'Removed' });
  },
);

export default router;


import express from 'express';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import pool from '../db';
import { validate, validateParams } from '../middleware/validate';
import {
  addRecurringBlockedSlotSchema,
  deleteRecurringBlockedSlotParamsSchema,
} from '../schemas/blockedSlotSchemas';

const router = express.Router();

router.get(
  '/',
  authMiddleware,
  authorizeRoles('staff'),
  async (_req, res) => {
    const result = await pool.query(
      'SELECT id, day_of_week, week_of_month, slot_id, reason FROM recurring_blocked_slots'
    );
    res.json(
      result.rows.map((r) => ({
        id: Number(r.id),
        dayOfWeek: Number(r.day_of_week),
        weekOfMonth: Number(r.week_of_month),
        slotId: Number(r.slot_id),
        reason: r.reason ?? '',
      }))
    );
  },
);

router.post(
  '/',
  authMiddleware,
  authorizeRoles('staff'),
  validate(addRecurringBlockedSlotSchema),
  async (req, res) => {
    const { dayOfWeek, weekOfMonth, slotId, reason } = req.body;
    await pool.query(
      'INSERT INTO recurring_blocked_slots (day_of_week, week_of_month, slot_id, reason) VALUES ($1, $2, $3, $4) ON CONFLICT (day_of_week, week_of_month, slot_id) DO UPDATE SET reason = EXCLUDED.reason',
      [dayOfWeek, weekOfMonth, slotId, reason ?? null],
    );
    res.json({ message: 'Added' });
  },
);

router.delete(
  '/:id',
  authMiddleware,
  authorizeRoles('staff'),
  validateParams(deleteRecurringBlockedSlotParamsSchema),
  async (req, res) => {
    const { id } = req.params;
    await pool.query('DELETE FROM recurring_blocked_slots WHERE id = $1', [id]);
    res.json({ message: 'Removed' });
  },
);

export default router;

import express from 'express';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import pool from '../db';
import { validate, validateParams } from '../middleware/validate';
import {
  addBlockedSlotSchema,
  deleteBlockedSlotParamsSchema,
} from '../schemas/blockedSlotSchemas';
import { formatReginaDate, reginaStartOfDayISO } from '../utils/dateUtils';

const router = express.Router();

router.get(
  '/',
  authMiddleware,
  authorizeRoles('staff'),
  async (req, res) => {
    const date = req.query.date as string;
    if (!date) return res.status(400).json({ message: 'Date required' });

    const reginaDate = formatReginaDate(date);
    const dateObj = new Date(reginaStartOfDayISO(reginaDate));
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ message: 'Invalid date' });
    }
    const day = dateObj.getDay();
    const weekOfMonth = Math.ceil(dateObj.getDate() / 7);

    const blockedResult = await pool.query(
      'SELECT slot_id, reason FROM blocked_slots WHERE date = $1',
      [reginaDate],
    );
    const recurringResult = await pool.query(
      'SELECT slot_id, reason FROM recurring_blocked_slots WHERE day_of_week = $1 AND week_of_month = $2',
      [day, weekOfMonth],
    );
    const map = new Map<number, string>();
    for (const r of recurringResult.rows) {
      map.set(Number(r.slot_id), r.reason ?? '');
    }
    for (const r of blockedResult.rows) {
      map.set(Number(r.slot_id), r.reason ?? '');
    }

    res.json(Array.from(map.entries()).map(([slotId, reason]) => ({ slotId, reason })));
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


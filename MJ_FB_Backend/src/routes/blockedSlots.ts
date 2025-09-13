import express from 'express';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import pool from '../db';
import { validate, validateParams } from '../middleware/validate';
import {
  addBlockedSlotSchema,
  deleteBlockedSlotParamsSchema,
} from '../schemas/blockedSlotSchemas';
import { formatReginaDate, reginaStartOfDayISO } from '../utils/dateUtils';
import { cleanupPastBlockedSlots } from '../jobs/blockedSlotCleanupJob';

const router = express.Router();

router.get(
  '/',
  authMiddleware,
  authorizeRoles('staff'),
  async (req, res) => {
    const date = req.query.date as string | undefined;
    if (!date) {
      const result = await pool.query(
        'SELECT date, slot_id, reason FROM blocked_slots ORDER BY date, slot_id',
      );
      return res.json(
        result.rows.map(r => ({
          date: r.date,
          slotId: Number(r.slot_id),
          reason: r.reason ?? '',
        })),
      );
    }

    let reginaDate: string;
    try {
      reginaDate = formatReginaDate(date);
    } catch {
      return res.status(400).json({ message: 'Invalid date' });
    }
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

    const result = Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([slotId, reason]) => ({ slotId, reason }));

    res.json(result);
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

router.post(
  '/cleanup',
  authMiddleware,
  authorizeRoles('admin'),
  async (_req, res) => {
    await cleanupPastBlockedSlots();
    res.json({ message: 'Cleanup complete' });
  },
);

export default router;


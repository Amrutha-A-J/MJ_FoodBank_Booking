import express from 'express';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import { savePushSubscription } from '../models/pushSubscription';

const router = express.Router();

router.post(
  '/',
  authMiddleware,
  authorizeRoles('volunteer', 'staff', 'user', 'agency'),
  async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
      await savePushSubscription(Number(req.user.id), req.user.role, req.body);
      res.status(201).json({ ok: true });
    } catch (err) {
      next(err);
    }
  },
);

export default router;

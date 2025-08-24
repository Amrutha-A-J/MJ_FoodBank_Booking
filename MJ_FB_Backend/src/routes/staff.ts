import express, { NextFunction } from 'express';
import { checkStaffExists, createStaff } from '../controllers/staffController';
import { authMiddleware } from '../middleware/authMiddleware';
import pool from '../db';

const router = express.Router();

router.get('/exists', checkStaffExists);

// Allow creation of the first staff account without authentication. Once at
// least one staff member exists, require standard staff authorization.
router.post('/', async (req, res, next: NextFunction) => {
  const result = await pool.query('SELECT COUNT(*) FROM staff');
  const count = parseInt(result.rows[0].count, 10);
  if (count === 0) {
    return createStaff(req, res, next);
  }
  authMiddleware(req, res, () => {
    const user = req.user as any;
    if (!user || user.role !== 'staff' || !user.access?.includes('admin')) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    return createStaff(req, res, next);
  });
});

export default router;

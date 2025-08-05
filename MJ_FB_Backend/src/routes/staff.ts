import express from 'express';
import { checkStaffExists, createStaff } from '../controllers/staffController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import pool from '../db';

const router = express.Router();

router.get('/exists', checkStaffExists);

// Allow creation of the first staff account without authentication. Once at
// least one staff member exists, require standard staff authorization.
router.post('/', async (req, res) => {
  const result = await pool.query('SELECT COUNT(*) FROM staff');
  const count = parseInt(result.rows[0].count, 10);
  if (count === 0) {
    return createStaff(req, res);
  }
  authMiddleware(req, res, () => {
    authorizeRoles('staff', 'volunteer_coordinator')(req, res, () =>
      createStaff(req, res)
    );
  });
});

export default router;

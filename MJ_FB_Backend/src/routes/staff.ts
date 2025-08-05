import express from 'express';
import { checkStaffExists, createAdmin, createStaff } from '../controllers/staffController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/exists', checkStaffExists);
router.post('/admin', createAdmin);
// Allow any authenticated staff role to create staff members
// Previously only admins could create staff, which resulted in 403 errors
// for standard staff accounts attempting to add new staff. Expanding the
// authorized roles aligns this endpoint with the user creation permissions.
router.post(
  '/',
  authMiddleware,
  authorizeRoles('staff', 'volunteer_coordinator', 'admin'),
  createStaff
);

export default router;

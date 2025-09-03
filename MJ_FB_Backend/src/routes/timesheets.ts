import express from 'express';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import {
  listMyTimesheets,
  listTimesheets,
  getTimesheetDays,
  updateTimesheetDay,
  submitTimesheet,
  rejectTimesheet,
  processTimesheet,
} from '../controllers/timesheetController';

const router = express.Router();

// list pay periods for the logged in staff member
router.get('/mine', authMiddleware, authorizeRoles('staff'), listMyTimesheets);
// admin can list timesheets for any staff
router.get('/', authMiddleware, authorizeRoles('admin'), listTimesheets);
router.get(
  '/:id/days',
  authMiddleware,
  authorizeRoles('staff', 'admin'),
  getTimesheetDays,
);
router.patch('/:id/days/:date', authMiddleware, authorizeRoles('staff'), updateTimesheetDay);
router.post('/:id/submit', authMiddleware, authorizeRoles('staff'), submitTimesheet);
router.post('/:id/reject', authMiddleware, authorizeRoles('admin'), rejectTimesheet);
router.post('/:id/process', authMiddleware, authorizeRoles('admin'), processTimesheet);

export default router;

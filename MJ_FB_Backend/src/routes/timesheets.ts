import express from 'express';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import {
  listMyTimesheets,
  getTimesheetDays,
  updateTimesheetDay,
  submitTimesheet,
  rejectTimesheet,
  processTimesheet,
} from '../controllers/timesheetController';

const router = express.Router();

// list pay periods for the logged in staff member
router.get('/mine', authMiddleware, authorizeRoles('staff'), listMyTimesheets);
// deprecated: retain root path for backwards compatibility
router.get('/', authMiddleware, authorizeRoles('staff'), listMyTimesheets);
router.get('/:id/days', authMiddleware, authorizeRoles('staff'), getTimesheetDays);
router.patch('/:id/days/:date', authMiddleware, authorizeRoles('staff'), updateTimesheetDay);
router.post('/:id/submit', authMiddleware, authorizeRoles('staff'), submitTimesheet);
router.post('/:id/reject', authMiddleware, authorizeRoles('staff'), rejectTimesheet);
router.post('/:id/process', authMiddleware, authorizeRoles('staff'), processTimesheet);

export default router;

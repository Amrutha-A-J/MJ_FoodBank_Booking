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

router.get('/', authMiddleware, authorizeRoles('staff'), listMyTimesheets);
router.get('/:id/days', authMiddleware, authorizeRoles('staff'), getTimesheetDays);
router.patch('/:id/days/:date', authMiddleware, authorizeRoles('staff'), updateTimesheetDay);
router.post('/:id/submit', authMiddleware, authorizeRoles('staff'), submitTimesheet);
router.post('/:id/reject', authMiddleware, authorizeRoles('staff'), rejectTimesheet);
router.post('/:id/process', authMiddleware, authorizeRoles('staff'), processTimesheet);

export default router;

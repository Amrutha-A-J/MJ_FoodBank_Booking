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

router.get('/', authMiddleware, listMyTimesheets);
router.get('/:id/days', authMiddleware, getTimesheetDays);
router.patch('/:id/days/:date', authMiddleware, updateTimesheetDay);
router.post('/:id/submit', authMiddleware, submitTimesheet);
router.post('/:id/reject', authMiddleware, authorizeRoles('staff'), rejectTimesheet);
router.post('/:id/process', authMiddleware, authorizeRoles('staff'), processTimesheet);

export default router;

import express from 'express';
import { authMiddleware, authorizeRoles } from '../../middleware/authMiddleware';
import { getTimesheetDaysAdmin } from '../../controllers/timesheetController';

const router = express.Router();

router.get('/:id/days', authMiddleware, authorizeRoles('admin'), getTimesheetDaysAdmin);

export default router;

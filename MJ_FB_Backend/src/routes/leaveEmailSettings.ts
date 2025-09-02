import { Router } from 'express';
import {
  authMiddleware,
  authorizeRoles,
  authorizeAccess,
} from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { leaveEmailSettingsSchema } from '../schemas/admin/leaveEmailSettingsSchema';
import {
  getLeaveEmailHandler,
  updateLeaveEmailHandler,
} from '../controllers/admin/leaveEmailSettingsController';

const router = Router();

router.use(authMiddleware);
router.use(authorizeRoles('staff'));
router.use(authorizeAccess('admin'));

router.get('/', getLeaveEmailHandler);
router.put('/', validate(leaveEmailSettingsSchema), updateLeaveEmailHandler);

export default router;

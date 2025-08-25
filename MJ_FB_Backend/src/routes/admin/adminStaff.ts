import { Router } from 'express';
import {
  listStaff,
  getStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  searchStaff,
} from '../../controllers/admin/adminStaffController';
import {
  authMiddleware,
  authorizeRoles,
  authorizeAccess,
} from '../../middleware/authMiddleware';
import { validate } from '../../middleware/validate';
import { createStaffSchema, updateStaffSchema } from '../../schemas/staffSchemas';

const router = Router();

router.use(authMiddleware);
router.use(authorizeRoles('staff'));
router.use(authorizeAccess('admin'));

router.get('/search', searchStaff);
router.get('/', listStaff);
router.get('/:id', getStaff);
router.post('/', validate(createStaffSchema), createStaff);
router.put('/:id', validate(updateStaffSchema), updateStaff);
router.delete('/:id', deleteStaff);

export default router;

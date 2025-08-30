import { Router } from 'express';
import {
  getWarehouseSettingsHandler,
  updateWarehouseSettingsHandler,
} from '../../controllers/admin/warehouseSettingsController';
import {
  authMiddleware,
  authorizeRoles,
  authorizeAccess,
} from '../../middleware/authMiddleware';
import { validate } from '../../middleware/validate';
import { warehouseSettingsSchema } from '../../schemas/admin/warehouseSettingsSchema';

const router = Router();

router.use(authMiddleware);
router.use(authorizeRoles('staff'));
router.use(authorizeAccess('admin'));

router.get('/', getWarehouseSettingsHandler);
router.put('/', validate(warehouseSettingsSchema), updateWarehouseSettingsHandler);

export default router;

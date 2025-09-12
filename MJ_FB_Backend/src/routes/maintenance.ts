import { Router } from 'express';
import {
  getMaintenanceStatus,
  setMaintenanceMode,
  setMaintenanceNotice,
  clearMaintenance,
} from '../controllers/maintenanceController';
import { authMiddleware, authorizeAccess } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { maintenanceSchema } from '../schemas/maintenanceSchema';

const router = Router();

router.get('/', getMaintenanceStatus);

router.put(
  '/',
  authMiddleware,
  authorizeAccess('admin'),
  validate(maintenanceSchema),
  setMaintenanceMode,
  setMaintenanceNotice,
  getMaintenanceStatus,
);

router.delete('/', authMiddleware, authorizeAccess('admin'), clearMaintenance);

export default router;

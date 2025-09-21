import { Router } from 'express';
import {
  getMaintenanceStatus,
  setMaintenanceMode,
  setMaintenanceNotice,
  clearMaintenance,
  clearMaintenanceStats,
  runVacuum,
  runVacuumForTable,
  getDeadRowStats,
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
router.delete(
  '/stats',
  authMiddleware,
  authorizeAccess('admin'),
  clearMaintenanceStats,
);

router.post('/vacuum', authMiddleware, authorizeAccess('admin'), runVacuum);
router.post(
  '/vacuum/:table',
  authMiddleware,
  authorizeAccess('admin'),
  runVacuumForTable,
);
router.get(
  '/vacuum/dead-rows',
  authMiddleware,
  authorizeAccess('admin'),
  getDeadRowStats,
);

export default router;

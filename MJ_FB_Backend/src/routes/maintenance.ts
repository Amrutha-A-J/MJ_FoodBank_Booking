import { Router } from 'express';
import {
  getMaintenanceStatus,
  getMaintenanceSettings,
  setMaintenanceMode,
  setMaintenanceNotice,
  setMaintenanceUpcomingNotice,
  clearMaintenance,
  clearMaintenanceStats,
  runVacuum,
  runVacuumForTable,
  getDeadRowStats,
  purgeMaintenanceData,
  runBookingCleanup,
} from '../controllers/maintenanceController';
import { authMiddleware, authorizeAccess } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import {
  maintenanceCleanupSchema,
  maintenanceSchema,
  maintenanceSettingsSchema,
  maintenancePurgeSchema,
} from '../schemas/maintenanceSchema';

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

router.get(
  '/settings',
  authMiddleware,
  authorizeAccess('admin'),
  getMaintenanceSettings,
);

router.put(
  '/settings',
  authMiddleware,
  authorizeAccess('admin'),
  validate(maintenanceSettingsSchema),
  setMaintenanceMode,
  setMaintenanceUpcomingNotice,
  getMaintenanceSettings,
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

router.post(
  '/purge',
  authMiddleware,
  authorizeAccess('admin'),
  validate(maintenancePurgeSchema),
  purgeMaintenanceData,
);

router.post(
  '/bookings/cleanup',
  authMiddleware,
  authorizeAccess('admin'),
  validate(maintenanceCleanupSchema),
  runBookingCleanup,
);

export default router;

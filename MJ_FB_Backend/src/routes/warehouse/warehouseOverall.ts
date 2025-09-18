import { Router } from 'express';
import {
  listWarehouseOverall,
  rebuildWarehouseOverall,
  exportWarehouseOverall,
  listAvailableYears,
  manualWarehouseOverall,
} from '../../controllers/warehouse/warehouseOverallController';
import { authMiddleware, authorizeAccess, authorizeStaffOrAccess } from '../../middleware/authMiddleware';

const staffOrAccess = authorizeStaffOrAccess ?? authorizeAccess;

const router = Router();

router.get(
  '/',
  authMiddleware,
  staffOrAccess('warehouse', 'donor_management'),
  listWarehouseOverall,
);
router.post(
  '/manual',
  authMiddleware,
  staffOrAccess('warehouse', 'donor_management'),
  manualWarehouseOverall,
);
router.post(
  '/rebuild',
  authMiddleware,
  staffOrAccess('warehouse', 'donor_management'),
  rebuildWarehouseOverall,
);
router.get(
  '/export',
  authMiddleware,
  staffOrAccess('warehouse', 'donor_management'),
  exportWarehouseOverall,
);
router.get(
  '/years',
  authMiddleware,
  staffOrAccess('warehouse', 'donor_management'),
  listAvailableYears,
);

export default router;

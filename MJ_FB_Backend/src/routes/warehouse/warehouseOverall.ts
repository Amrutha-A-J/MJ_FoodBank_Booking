import { Router } from 'express';
import {
  listWarehouseOverall,
  listAvailableYears,
  rebuildWarehouseOverall,
  manualWarehouseOverall,
  exportWarehouseOverall,
  listMonthlyDonationHistory,
  exportMonthlyDonationHistory,
} from '../../controllers/warehouse/warehouseOverallController';
import { authMiddleware, authorizeAccess, authorizeStaffOrAccess } from '../../middleware/authMiddleware';

const staffOrAccess = authorizeStaffOrAccess ?? authorizeAccess;

const router = Router();

router.get('/', authMiddleware, staffOrAccess('warehouse', 'donor_management'), listWarehouseOverall);
router.get(
  '/years',
  authMiddleware,
  staffOrAccess('warehouse', 'donor_management'),
  listAvailableYears,
);
router.post(
  '/rebuild',
  authMiddleware,
  staffOrAccess('warehouse', 'donor_management'),
  rebuildWarehouseOverall,
);
router.post(
  '/manual',
  authMiddleware,
  staffOrAccess('warehouse', 'donor_management'),
  manualWarehouseOverall,
);
router.get(
  '/export',
  authMiddleware,
  staffOrAccess('warehouse', 'donor_management'),
  exportWarehouseOverall,
);
router.get(
  '/monthly-history',
  authMiddleware,
  staffOrAccess('warehouse', 'donor_management'),
  listMonthlyDonationHistory,
);
router.get(
  '/monthly-history/export',
  authMiddleware,
  staffOrAccess('warehouse', 'donor_management'),
  exportMonthlyDonationHistory,
);

export default router;

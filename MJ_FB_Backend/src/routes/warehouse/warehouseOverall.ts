import { Router } from 'express';
import {
  listWarehouseOverall,
  rebuildWarehouseOverall,
  exportWarehouseOverall,
  listAvailableYears,
  manualWarehouseOverall,
} from '../../controllers/warehouse/warehouseOverallController';
import { authMiddleware, authorizeAccess } from '../../middleware/authMiddleware';

const router = Router();

router.get(
  '/',
  authMiddleware,
  authorizeAccess('warehouse', 'donor_management'),
  listWarehouseOverall,
);
router.post(
  '/manual',
  authMiddleware,
  authorizeAccess('warehouse', 'donor_management'),
  manualWarehouseOverall,
);
router.post(
  '/rebuild',
  authMiddleware,
  authorizeAccess('warehouse', 'donor_management'),
  rebuildWarehouseOverall,
);
router.get(
  '/export',
  authMiddleware,
  authorizeAccess('warehouse', 'donor_management'),
  exportWarehouseOverall,
);
router.get(
  '/years',
  authMiddleware,
  authorizeAccess('warehouse', 'donor_management'),
  listAvailableYears,
);

export default router;

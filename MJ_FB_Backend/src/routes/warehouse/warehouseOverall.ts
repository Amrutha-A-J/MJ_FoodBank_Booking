import { Router } from 'express';
import {
  listWarehouseOverall,
  rebuildWarehouseOverall,
  exportWarehouseOverall,
  listAvailableYears,
} from '../../controllers/warehouse/warehouseOverallController';
import { authMiddleware, authorizeAccess } from '../../middleware/authMiddleware';

const router = Router();

router.get(
  '/',
  authMiddleware,
  authorizeAccess('warehouse', 'aggregations'),
  listWarehouseOverall,
);
router.post(
  '/rebuild',
  authMiddleware,
  authorizeAccess('warehouse', 'aggregations'),
  rebuildWarehouseOverall,
);
router.get(
  '/export',
  authMiddleware,
  authorizeAccess('warehouse', 'aggregations'),
  exportWarehouseOverall,
);
router.get(
  '/years',
  authMiddleware,
  authorizeAccess('warehouse', 'aggregations'),
  listAvailableYears,
);

export default router;

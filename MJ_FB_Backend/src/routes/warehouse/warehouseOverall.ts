import { Router } from 'express';
import {
  listWarehouseOverall,
  rebuildWarehouseOverall,
  exportWarehouseOverall,
  listAvailableYears,
  manualWarehouseOverall,
} from '../../controllers/warehouse/warehouseOverallController';
import {
  authMiddleware,
  authorizeAccess,
  authorizeAccessOrStaff as baseAuthorizeAccessOrStaff,
} from '../../middleware/authMiddleware';

const authorizeWarehouseAggregations =
  (baseAuthorizeAccessOrStaff as typeof authorizeAccess | undefined) ?? authorizeAccess;

const router = Router();

router.get(
  '/',
  authMiddleware,
  authorizeWarehouseAggregations('warehouse', 'aggregations'),
  listWarehouseOverall,
);
router.post(
  '/manual',
  authMiddleware,
  authorizeWarehouseAggregations('warehouse', 'aggregations'),
  manualWarehouseOverall,
);
router.post(
  '/rebuild',
  authMiddleware,
  authorizeWarehouseAggregations('warehouse', 'aggregations'),
  rebuildWarehouseOverall,
);
router.get(
  '/export',
  authMiddleware,
  authorizeWarehouseAggregations('warehouse', 'aggregations'),
  exportWarehouseOverall,
);
router.get(
  '/years',
  authMiddleware,
  authorizeWarehouseAggregations('warehouse', 'aggregations'),
  listAvailableYears,
);

export default router;

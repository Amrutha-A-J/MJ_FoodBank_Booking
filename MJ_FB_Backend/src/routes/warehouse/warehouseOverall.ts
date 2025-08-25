import { Router } from 'express';
import {
  listWarehouseOverall,
  rebuildWarehouseOverall,
  exportWarehouseOverall,
  listAvailableYears,
} from '../../controllers/warehouse/warehouseOverallController';
import { authMiddleware, authorizeAccess } from '../../middleware/authMiddleware';

const router = Router();

router.get('/', listWarehouseOverall);
router.post('/rebuild', authMiddleware, authorizeAccess('warehouse'), rebuildWarehouseOverall);
router.get('/export', exportWarehouseOverall);
router.get('/years', listAvailableYears);

export default router;

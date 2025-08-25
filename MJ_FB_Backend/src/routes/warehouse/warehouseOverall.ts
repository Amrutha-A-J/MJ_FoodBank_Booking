import { Router } from 'express';
import {
  listWarehouseOverall,
  rebuildWarehouseOverall,
  exportWarehouseOverall,
} from '../../controllers/warehouse/warehouseOverallController';
import { authMiddleware, authorizeAccess } from '../../middleware/authMiddleware';

const router = Router();

router.get('/', listWarehouseOverall);
router.post('/rebuild', authMiddleware, authorizeAccess('warehouse'), rebuildWarehouseOverall);
router.get('/export', exportWarehouseOverall);

export default router;

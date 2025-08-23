import { Router } from 'express';
import { listWarehouseOverall, rebuildWarehouseOverall, exportWarehouseOverall } from '../controllers/warehouseOverallController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/', listWarehouseOverall);
router.post('/rebuild', authMiddleware, authorizeRoles('staff'), rebuildWarehouseOverall);
router.get('/export', exportWarehouseOverall);

export default router;

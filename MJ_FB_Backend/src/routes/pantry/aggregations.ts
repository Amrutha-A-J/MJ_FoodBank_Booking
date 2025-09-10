import { Router } from 'express';
import {
  listWeeklyAggregations,
  listMonthlyAggregations,
  listYearlyAggregations,
  listAvailableYears,
  exportAggregations,
  rebuildAggregations,
} from '../../controllers/pantryAggregationController';
import { authMiddleware, authorizeAccess } from '../../middleware/authMiddleware';

const router = Router();

router.get('/weekly', listWeeklyAggregations);
router.get('/monthly', listMonthlyAggregations);
router.get('/yearly', listYearlyAggregations);
router.get('/years', listAvailableYears);
router.get('/export', exportAggregations);
router.post('/rebuild', authMiddleware, authorizeAccess('pantry', 'aggregations'), rebuildAggregations);

export default router;


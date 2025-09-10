import { Router } from 'express';
import {
  listWeeklyAggregations,
  listMonthlyAggregations,
  listYearlyAggregations,
  listAvailableYears,
  listAvailableMonths,
  listAvailableWeeks,
  exportAggregations,
  rebuildAggregations,
} from '../../controllers/pantryAggregationController';
import { authMiddleware, authorizeAccess } from '../../middleware/authMiddleware';

const router = Router();

router.get(
  '/weekly',
  authMiddleware,
  authorizeAccess('pantry', 'aggregations'),
  listWeeklyAggregations,
);
router.get(
  '/monthly',
  authMiddleware,
  authorizeAccess('pantry', 'aggregations'),
  listMonthlyAggregations,
);
router.get(
  '/yearly',
  authMiddleware,
  authorizeAccess('pantry', 'aggregations'),
  listYearlyAggregations,
);
router.get(
  '/years',
  authMiddleware,
  authorizeAccess('pantry', 'aggregations'),
  listAvailableYears,
);
router.get(
  '/months',
  authMiddleware,
  authorizeAccess('pantry', 'aggregations'),
  listAvailableMonths,
);
router.get(
  '/weeks',
  authMiddleware,
  authorizeAccess('pantry', 'aggregations'),
  listAvailableWeeks,
);
router.get(
  '/export',
  authMiddleware,
  authorizeAccess('pantry', 'aggregations'),
  exportAggregations,
);
router.post('/rebuild', authMiddleware, authorizeAccess('pantry', 'aggregations'), rebuildAggregations);

export default router;


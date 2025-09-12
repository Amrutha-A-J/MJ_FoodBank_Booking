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
  manualPantryAggregate,
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
router.post(
  '/manual',
  authMiddleware,
  authorizeAccess('pantry', 'aggregations'),
  // Body: { year, month, week?, orders?, adults?, children?, people?, weight? }
  manualPantryAggregate,
);

export default router;


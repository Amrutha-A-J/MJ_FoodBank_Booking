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
  manualWeeklyPantryAggregate,
} from '../../controllers/pantryAggregationController';
import {
  authMiddleware,
  authorizeAccess,
  authorizeAccessOrStaff as baseAuthorizeAccessOrStaff,
} from '../../middleware/authMiddleware';

const authorizeAggregationsAccess =
  (baseAuthorizeAccessOrStaff as typeof authorizeAccess | undefined) ?? authorizeAccess;

const router = Router();

router.get(
  '/weekly',
  authMiddleware,
  authorizeAggregationsAccess('pantry', 'aggregations'),
  listWeeklyAggregations,
);
router.get(
  '/monthly',
  authMiddleware,
  authorizeAggregationsAccess('pantry', 'aggregations'),
  listMonthlyAggregations,
);
router.get(
  '/yearly',
  authMiddleware,
  authorizeAggregationsAccess('pantry', 'aggregations'),
  listYearlyAggregations,
);
router.get(
  '/years',
  authMiddleware,
  authorizeAggregationsAccess('pantry', 'aggregations'),
  listAvailableYears,
);
router.get(
  '/months',
  authMiddleware,
  authorizeAggregationsAccess('pantry', 'aggregations'),
  listAvailableMonths,
);
router.get(
  '/weeks',
  authMiddleware,
  authorizeAggregationsAccess('pantry', 'aggregations'),
  listAvailableWeeks,
);
router.get(
  '/export',
  authMiddleware,
  authorizeAggregationsAccess('pantry', 'aggregations'),
  exportAggregations,
);
router.post('/rebuild', authMiddleware, authorizeAggregationsAccess('pantry', 'aggregations'), rebuildAggregations);
router.post(
  '/manual',
  authMiddleware,
  authorizeAggregationsAccess('pantry', 'aggregations'),
  // Body: { year, month, week?, orders?, adults?, children?, people?, weight? }
  manualPantryAggregate,
);
router.post(
  '/manual/weekly',
  authMiddleware,
  authorizeAggregationsAccess('pantry', 'aggregations'),
  // Body: { year, month, week, orders?, adults?, children?, people?, weight? }
  manualWeeklyPantryAggregate,
);

export default router;


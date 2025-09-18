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
import { authMiddleware, authorizeAccess } from '../../middleware/authMiddleware';

const router = Router();

router.get(
  '/weekly',
  authMiddleware,
  authorizeAccess('pantry', 'warehouse', 'donor_management'),
  listWeeklyAggregations,
);
router.get(
  '/monthly',
  authMiddleware,
  authorizeAccess('pantry', 'warehouse', 'donor_management'),
  listMonthlyAggregations,
);
router.get(
  '/yearly',
  authMiddleware,
  authorizeAccess('pantry', 'warehouse', 'donor_management'),
  listYearlyAggregations,
);
router.get(
  '/years',
  authMiddleware,
  authorizeAccess('pantry', 'warehouse', 'donor_management'),
  listAvailableYears,
);
router.get(
  '/months',
  authMiddleware,
  authorizeAccess('pantry', 'warehouse', 'donor_management'),
  listAvailableMonths,
);
router.get(
  '/weeks',
  authMiddleware,
  authorizeAccess('pantry', 'warehouse', 'donor_management'),
  listAvailableWeeks,
);
router.get(
  '/export',
  authMiddleware,
  authorizeAccess('pantry', 'warehouse', 'donor_management'),
  exportAggregations,
);
router.post(
  '/rebuild',
  authMiddleware,
  authorizeAccess('pantry', 'warehouse', 'donor_management'),
  rebuildAggregations,
);
router.post(
  '/manual',
  authMiddleware,
  authorizeAccess('pantry', 'warehouse', 'donor_management'),
  // Body: { year, month, week?, orders?, adults?, children?, people?, weight? }
  manualPantryAggregate,
);
router.post(
  '/manual/weekly',
  authMiddleware,
  authorizeAccess('pantry', 'warehouse', 'donor_management'),
  // Body: { year, month, week, orders?, adults?, children?, people?, weight? }
  manualWeeklyPantryAggregate,
);

export default router;


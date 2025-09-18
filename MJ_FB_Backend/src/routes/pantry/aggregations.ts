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
import { authMiddleware, authorizeAccess, authorizeStaffOrAccess } from '../../middleware/authMiddleware';

const staffOrAccess = authorizeStaffOrAccess ?? authorizeAccess;

const router = Router();

router.get(
  '/weekly',
  authMiddleware,
  staffOrAccess('pantry', 'warehouse', 'donor_management'),
  listWeeklyAggregations,
);
router.get(
  '/monthly',
  authMiddleware,
  staffOrAccess('pantry', 'warehouse', 'donor_management'),
  listMonthlyAggregations,
);
router.get(
  '/yearly',
  authMiddleware,
  staffOrAccess('pantry', 'warehouse', 'donor_management'),
  listYearlyAggregations,
);
router.get(
  '/years',
  authMiddleware,
  staffOrAccess('pantry', 'warehouse', 'donor_management'),
  listAvailableYears,
);
router.get(
  '/months',
  authMiddleware,
  staffOrAccess('pantry', 'warehouse', 'donor_management'),
  listAvailableMonths,
);
router.get(
  '/weeks',
  authMiddleware,
  staffOrAccess('pantry', 'warehouse', 'donor_management'),
  listAvailableWeeks,
);
router.get(
  '/export',
  authMiddleware,
  staffOrAccess('pantry', 'warehouse', 'donor_management'),
  exportAggregations,
);
router.post(
  '/rebuild',
  authMiddleware,
  staffOrAccess('pantry', 'warehouse', 'donor_management'),
  rebuildAggregations,
);
router.post(
  '/manual',
  authMiddleware,
  staffOrAccess('pantry', 'warehouse', 'donor_management'),
  // Body: { year, month, week?, orders?, adults?, children?, people?, weight? }
  manualPantryAggregate,
);
router.post(
  '/manual/weekly',
  authMiddleware,
  staffOrAccess('pantry', 'warehouse', 'donor_management'),
  // Body: { year, month, week, orders?, adults?, children?, people?, weight? }
  manualWeeklyPantryAggregate,
);

export default router;


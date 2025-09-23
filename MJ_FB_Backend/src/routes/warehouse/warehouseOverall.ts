import { Router } from 'express';
import {
  listMonthlyDonationHistory,
  exportMonthlyDonationHistory,
} from '../../controllers/warehouse/warehouseOverallController';
import { authMiddleware, authorizeAccess, authorizeStaffOrAccess } from '../../middleware/authMiddleware';

const staffOrAccess = authorizeStaffOrAccess ?? authorizeAccess;

const router = Router();

router.get(
  '/monthly-history',
  authMiddleware,
  staffOrAccess('warehouse', 'donor_management'),
  listMonthlyDonationHistory,
);
router.get(
  '/monthly-history/export',
  authMiddleware,
  staffOrAccess('warehouse', 'donor_management'),
  exportMonthlyDonationHistory,
);

export default router;

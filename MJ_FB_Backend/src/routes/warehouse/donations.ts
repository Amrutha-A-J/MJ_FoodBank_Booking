import { Router } from 'express';
import {
  listDonations,
  addDonation,
  updateDonation,
  deleteDonation,
  donorAggregations,
  exportDonorAggregations,
  manualDonorAggregation,
} from '../../controllers/warehouse/donationController';
import { authMiddleware, authorizeAccess } from '../../middleware/authMiddleware';
import { validate } from '../../middleware/validate';
import {
  addDonationSchema,
  updateDonationSchema,
  manualDonorAggregationSchema,
} from '../../schemas/warehouse/donationSchemas';

const router = Router();

router.get('/', authMiddleware, authorizeAccess('warehouse', 'donation_entry'), listDonations);
router.get(
  '/aggregations',
  authMiddleware,
  authorizeAccess('warehouse', 'donation_entry', 'donor_management'),
  donorAggregations,
);
router.get(
  '/aggregations/export',
  authMiddleware,
  authorizeAccess('warehouse', 'donation_entry', 'donor_management'),
  exportDonorAggregations,
);
router.post(
  '/aggregations/manual',
  authMiddleware,
  authorizeAccess('warehouse', 'donor_management'),
  validate(manualDonorAggregationSchema),
  manualDonorAggregation,
);
router.post('/', authMiddleware, authorizeAccess('warehouse', 'donation_entry'), validate(addDonationSchema), addDonation);
router.put('/:id', authMiddleware, authorizeAccess('warehouse', 'donation_entry'), validate(updateDonationSchema), updateDonation);
router.delete('/:id', authMiddleware, authorizeAccess('warehouse', 'donation_entry'), deleteDonation);

export default router;

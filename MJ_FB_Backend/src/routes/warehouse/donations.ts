import { Router } from 'express';
import {
  listDonations,
  addDonation,
  updateDonation,
  deleteDonation,
  donorAggregations,
  exportDonorAggregations,
} from '../../controllers/warehouse/donationController';
import { authMiddleware, authorizeAccess } from '../../middleware/authMiddleware';
import { validate } from '../../middleware/validate';
import { addDonationSchema, updateDonationSchema } from '../../schemas/warehouse/donationSchemas';

const router = Router();

router.get('/', authMiddleware, authorizeAccess('warehouse', 'donation_entry'), listDonations);
router.get(
  '/aggregations',
  authMiddleware,
  authorizeAccess('warehouse', 'donation_entry', 'aggregations'),
  donorAggregations,
);
router.get('/aggregations/export', exportDonorAggregations);
router.post('/', authMiddleware, authorizeAccess('warehouse', 'donation_entry'), validate(addDonationSchema), addDonation);
router.put('/:id', authMiddleware, authorizeAccess('warehouse', 'donation_entry'), validate(updateDonationSchema), updateDonation);
router.delete('/:id', authMiddleware, authorizeAccess('warehouse', 'donation_entry'), deleteDonation);

export default router;

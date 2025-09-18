import { Router } from 'express';
import {
  listDonors,
  addDonor,
  updateDonor,
  topDonors,
  getDonor,
  donorDonations,
} from '../controllers/donorController';
import { authMiddleware, authorizeAccess } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { addDonorSchema, updateDonorSchema } from '../schemas/donorSchemas';

const router = Router();

// Public endpoint to list top donors
router.get('/top', topDonors);
router.get('/', authMiddleware, authorizeAccess('warehouse', 'donation_entry'), listDonors);
router.post('/', authMiddleware, authorizeAccess('warehouse', 'donation_entry'), validate(addDonorSchema), addDonor);
router.put(
  '/:id',
  authMiddleware,
  authorizeAccess('warehouse', 'donation_entry'),
  validate(updateDonorSchema),
  updateDonor,
);
router.get('/:id', authMiddleware, authorizeAccess('warehouse', 'donation_entry'), getDonor);
router.get('/:id/donations', authMiddleware, authorizeAccess('warehouse', 'donation_entry'), donorDonations);

export default router;

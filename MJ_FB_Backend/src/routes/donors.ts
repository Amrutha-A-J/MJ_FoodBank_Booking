import { Router } from 'express';
import {
  listDonors,
  addDonor,
  topDonors,
  getDonor,
  donorDonations,
} from '../controllers/donorController';
import { authMiddleware, authorizeAccess } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { addDonorSchema } from '../schemas/donorSchemas';

const router = Router();

// Public endpoint to list top donors
router.get('/top', topDonors);
router.get('/', authMiddleware, authorizeAccess('warehouse'), listDonors);
router.post('/', authMiddleware, authorizeAccess('warehouse'), validate(addDonorSchema), addDonor);
router.get('/:id', authMiddleware, authorizeAccess('warehouse'), getDonor);
router.get('/:id/donations', authMiddleware, authorizeAccess('warehouse'), donorDonations);

export default router;

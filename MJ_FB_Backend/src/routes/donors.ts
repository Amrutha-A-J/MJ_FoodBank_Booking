import { Router } from 'express';
import {
  listDonors,
  addDonor,
  topDonors,
  getDonor,
  donorDonations,
} from '../controllers/donorController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { addDonorSchema } from '../schemas/donorSchemas';

const router = Router();

// Public endpoint to list top donors
router.get('/top', topDonors);
router.get('/', authMiddleware, authorizeRoles('staff'), listDonors);
router.post('/', authMiddleware, authorizeRoles('staff'), validate(addDonorSchema), addDonor);
router.get('/:id', authMiddleware, authorizeRoles('staff'), getDonor);
router.get('/:id/donations', authMiddleware, authorizeRoles('staff'), donorDonations);

export default router;

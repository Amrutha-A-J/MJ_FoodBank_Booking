import { Router } from 'express';
import { listDonations, addDonation, updateDonation, deleteDonation } from '../controllers/donationController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { addDonationSchema, updateDonationSchema } from '../schemas/donationSchemas';

const router = Router();

router.get('/', authMiddleware, authorizeRoles('staff'), listDonations);
router.post('/', authMiddleware, authorizeRoles('staff'), validate(addDonationSchema), addDonation);
router.put('/:id', authMiddleware, authorizeRoles('staff'), validate(updateDonationSchema), updateDonation);
router.delete('/:id', authMiddleware, authorizeRoles('staff'), deleteDonation);

export default router;

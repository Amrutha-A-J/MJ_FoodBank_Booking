import { Router } from 'express';
import { listOutgoingDonations, addOutgoingDonation, updateOutgoingDonation, deleteOutgoingDonation } from '../controllers/outgoingDonationController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { addOutgoingDonationSchema, updateOutgoingDonationSchema } from '../schemas/outgoingDonationSchemas';

const router = Router();

router.get('/', authMiddleware, authorizeRoles('staff'), listOutgoingDonations);
router.post('/', authMiddleware, authorizeRoles('staff'), validate(addOutgoingDonationSchema), addOutgoingDonation);
router.put('/:id', authMiddleware, authorizeRoles('staff'), validate(updateOutgoingDonationSchema), updateOutgoingDonation);
router.delete('/:id', authMiddleware, authorizeRoles('staff'), deleteOutgoingDonation);

export default router;

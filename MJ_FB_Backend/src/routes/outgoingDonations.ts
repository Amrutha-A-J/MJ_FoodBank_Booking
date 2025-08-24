import { Router } from 'express';
import { listOutgoingDonations, addOutgoingDonation, updateOutgoingDonation, deleteOutgoingDonation } from '../controllers/outgoingDonationController';
import { authMiddleware, authorizeAccess } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { addOutgoingDonationSchema, updateOutgoingDonationSchema } from '../schemas/outgoingDonationSchemas';

const router = Router();

router.get('/', authMiddleware, authorizeAccess('warehouse'), listOutgoingDonations);
router.post('/', authMiddleware, authorizeAccess('warehouse'), validate(addOutgoingDonationSchema), addOutgoingDonation);
router.put('/:id', authMiddleware, authorizeAccess('warehouse'), validate(updateOutgoingDonationSchema), updateOutgoingDonation);
router.delete('/:id', authMiddleware, authorizeAccess('warehouse'), deleteOutgoingDonation);

export default router;

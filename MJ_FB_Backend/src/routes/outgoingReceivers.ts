import { Router } from 'express';
import { listOutgoingReceivers, addOutgoingReceiver } from '../controllers/outgoingReceiverController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { addOutgoingReceiverSchema } from '../schemas/outgoingReceiverSchemas';

const router = Router();

router.get('/', authMiddleware, authorizeRoles('staff'), listOutgoingReceivers);
router.post('/', authMiddleware, authorizeRoles('staff'), validate(addOutgoingReceiverSchema), addOutgoingReceiver);

export default router;

import { Router } from 'express';
import {
  listOutgoingReceivers,
  addOutgoingReceiver,
  topOutgoingReceivers,
} from '../controllers/outgoingReceiverController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { addOutgoingReceiverSchema } from '../schemas/outgoingReceiverSchemas';

const router = Router();

// Public endpoint to list top outgoing receivers
router.get('/top', topOutgoingReceivers);
router.get('/', authMiddleware, authorizeRoles('staff'), listOutgoingReceivers);
router.post('/', authMiddleware, authorizeRoles('staff'), validate(addOutgoingReceiverSchema), addOutgoingReceiver);

export default router;

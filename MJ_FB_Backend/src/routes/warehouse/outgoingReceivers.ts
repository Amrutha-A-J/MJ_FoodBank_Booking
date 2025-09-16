import { Router } from 'express';
import {
  listOutgoingReceivers,
  addOutgoingReceiver,
  deleteOutgoingReceiver,
  topOutgoingReceivers,
} from '../../controllers/warehouse/outgoingReceiverController';
import { authMiddleware, authorizeAccess } from '../../middleware/authMiddleware';
import { validate } from '../../middleware/validate';
import { addOutgoingReceiverSchema } from '../../schemas/warehouse/outgoingReceiverSchemas';

const router = Router();

// Public endpoint to list top outgoing receivers
router.get('/top', topOutgoingReceivers);
router.get('/', authMiddleware, authorizeAccess('warehouse'), listOutgoingReceivers);
router.post('/', authMiddleware, authorizeAccess('warehouse'), validate(addOutgoingReceiverSchema), addOutgoingReceiver);
router.delete('/:id', authMiddleware, authorizeAccess('warehouse'), deleteOutgoingReceiver);

export default router;

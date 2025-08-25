import { Router } from 'express';
import { listEvents, createEvent, deleteEvent } from '../controllers/eventController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { createEventSchema } from '../schemas/eventSchemas';

const router = Router();

router.get('/', listEvents);
router.post('/', authMiddleware, authorizeRoles('staff'), validate(createEventSchema), createEvent);
router.delete('/:id', authMiddleware, authorizeRoles('staff'), deleteEvent);

export default router;

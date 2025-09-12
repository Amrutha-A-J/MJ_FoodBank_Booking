import { Router } from 'express';
import { listEvents, createEvent, deleteEvent, updateEvent } from '../controllers/eventController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { createEventSchema, updateEventSchema } from '../schemas/eventSchemas';

const router = Router();

router.get('/', authMiddleware, listEvents);
router.post('/', authMiddleware, authorizeRoles('staff'), validate(createEventSchema), createEvent);
router.put('/:id', authMiddleware, authorizeRoles('staff'), validate(updateEventSchema), updateEvent);
router.delete('/:id', authMiddleware, authorizeRoles('staff'), deleteEvent);

export default router;

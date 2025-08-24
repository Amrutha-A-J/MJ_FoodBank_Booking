import { Router } from 'express';
import { listEvents, createEvent } from '../controllers/eventController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { createEventSchema } from '../schemas/eventSchemas';

const router = Router();

router.get('/', listEvents);
router.post('/', authMiddleware, authorizeRoles('staff'), validate(createEventSchema), createEvent);

export default router;

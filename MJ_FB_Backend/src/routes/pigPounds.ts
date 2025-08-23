import { Router } from 'express';
import { listPigPounds, addPigPound, updatePigPound, deletePigPound } from '../controllers/pigPoundController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { addPigPoundSchema, updatePigPoundSchema } from '../schemas/pigPoundSchemas';

const router = Router();

router.get('/', authMiddleware, authorizeRoles('staff'), listPigPounds);
router.post('/', authMiddleware, authorizeRoles('staff'), validate(addPigPoundSchema), addPigPound);
router.put('/:id', authMiddleware, authorizeRoles('staff'), validate(updatePigPoundSchema), updatePigPound);
router.delete('/:id', authMiddleware, authorizeRoles('staff'), deletePigPound);

export default router;

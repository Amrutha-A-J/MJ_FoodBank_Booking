import { Router } from 'express';
import { listSurplus, addSurplus, updateSurplus, deleteSurplus } from '../controllers/surplusController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { addSurplusSchema, updateSurplusSchema } from '../schemas/surplusSchemas';

const router = Router();

router.get('/', authMiddleware, authorizeRoles('staff'), listSurplus);
router.post('/', authMiddleware, authorizeRoles('staff'), validate(addSurplusSchema), addSurplus);
router.put('/:id', authMiddleware, authorizeRoles('staff'), validate(updateSurplusSchema), updateSurplus);
router.delete('/:id', authMiddleware, authorizeRoles('staff'), deleteSurplus);

export default router;

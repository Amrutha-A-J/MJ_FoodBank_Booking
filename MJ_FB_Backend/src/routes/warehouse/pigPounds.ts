import { Router } from 'express';
import { listPigPounds, addPigPound, updatePigPound, deletePigPound } from '../../controllers/warehouse/pigPoundController';
import { authMiddleware, authorizeAccess } from '../../middleware/authMiddleware';
import { validate } from '../../middleware/validate';
import { addPigPoundSchema, updatePigPoundSchema } from '../../schemas/warehouse/pigPoundSchemas';

const router = Router();

router.get('/', authMiddleware, authorizeAccess('warehouse'), listPigPounds);
router.post('/', authMiddleware, authorizeAccess('warehouse'), validate(addPigPoundSchema), addPigPound);
router.put('/:id', authMiddleware, authorizeAccess('warehouse'), validate(updatePigPoundSchema), updatePigPound);
router.delete('/:id', authMiddleware, authorizeAccess('warehouse'), deletePigPound);

export default router;

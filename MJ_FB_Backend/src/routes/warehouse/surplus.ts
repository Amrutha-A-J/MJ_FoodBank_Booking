import { Router } from 'express';
import {
  listSurplus,
  addSurplus,
  updateSurplus,
  deleteSurplus,
} from '../../controllers/warehouse/surplusController';
import { authMiddleware, authorizeAccess } from '../../middleware/authMiddleware';
import { validate } from '../../middleware/validate';
import { addSurplusSchema, updateSurplusSchema } from '../../schemas/surplusSchemas';

const router = Router();

router.get('/', authMiddleware, authorizeAccess('warehouse'), listSurplus);
router.post('/', authMiddleware, authorizeAccess('warehouse'), validate(addSurplusSchema), addSurplus);
router.put('/:id', authMiddleware, authorizeAccess('warehouse'), validate(updateSurplusSchema), updateSurplus);
router.delete('/:id', authMiddleware, authorizeAccess('warehouse'), deleteSurplus);

export default router;

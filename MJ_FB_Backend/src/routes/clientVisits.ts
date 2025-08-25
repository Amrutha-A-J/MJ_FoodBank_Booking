import { Router } from 'express';
import { listVisits, addVisit, updateVisit, deleteVisit } from '../controllers/clientVisitController';
import { authMiddleware, authorizeAccess } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { addVisitSchema, updateVisitSchema } from '../schemas/clientVisitSchemas';

const router = Router();

router.get('/', authMiddleware, authorizeAccess('pantry'), listVisits);
router.post('/', authMiddleware, authorizeAccess('pantry'), validate(addVisitSchema), addVisit);
router.put('/:id', authMiddleware, authorizeAccess('pantry'), validate(updateVisitSchema), updateVisit);
router.delete('/:id', authMiddleware, authorizeAccess('pantry'), deleteVisit);

export default router;

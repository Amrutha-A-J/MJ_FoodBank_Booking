import { Router } from 'express';
import {
  listVisits,
  addVisit,
  updateVisit,
  deleteVisit,
  getVisitStats,
  toggleVisitVerification,
} from '../controllers/clientVisitController';
import { authMiddleware, authorizeAccess } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { addVisitSchema, updateVisitSchema } from '../schemas/clientVisitSchemas';

const router = Router();

router.get('/', authMiddleware, authorizeAccess('pantry'), listVisits);
// GET /client-visits/stats?days=30
// GET /client-visits/stats?group=month&months=12
router.get('/stats', authMiddleware, authorizeAccess('pantry'), getVisitStats);
router.post('/', authMiddleware, authorizeAccess('pantry'), validate(addVisitSchema), addVisit);
router.put('/:id', authMiddleware, authorizeAccess('pantry'), validate(updateVisitSchema), updateVisit);
router.patch('/:id/verify', authMiddleware, authorizeAccess('pantry'), toggleVisitVerification);
router.delete('/:id', authMiddleware, authorizeAccess('pantry'), deleteVisit);
export default router;

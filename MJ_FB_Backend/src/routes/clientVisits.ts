import { Router } from 'express';
import {
  listVisits,
  addVisit,
  updateVisit,
  deleteVisit,
  bulkImportVisits,
  importVisitsFromXlsx,
  getVisitStats,
} from '../controllers/clientVisitController';
import { authMiddleware, authorizeAccess } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { addVisitSchema, updateVisitSchema } from '../schemas/clientVisitSchemas';
import multer from 'multer';

const upload = multer();

const router = Router();

router.get('/', authMiddleware, authorizeAccess('pantry'), listVisits);
router.get('/stats', authMiddleware, authorizeAccess('pantry'), getVisitStats);
router.post('/', authMiddleware, authorizeAccess('pantry'), validate(addVisitSchema), addVisit);
router.put('/:id', authMiddleware, authorizeAccess('pantry'), validate(updateVisitSchema), updateVisit);
router.delete('/:id', authMiddleware, authorizeAccess('pantry'), deleteVisit);
router.post('/import', authMiddleware, authorizeAccess('pantry'), upload.single('file'), bulkImportVisits);
router.post(
  '/import/xlsx',
  authMiddleware,
  authorizeAccess('pantry'),
  upload.single('file'),
  importVisitsFromXlsx,
);

export default router;

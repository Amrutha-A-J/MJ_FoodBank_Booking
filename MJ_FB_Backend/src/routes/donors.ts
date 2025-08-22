import { Router } from 'express';
import { listDonors, addDonor } from '../controllers/donorController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { addDonorSchema } from '../schemas/donorSchemas';

const router = Router();

router.get('/', authMiddleware, authorizeRoles('staff'), listDonors);
router.post('/', authMiddleware, authorizeRoles('staff'), validate(addDonorSchema), addDonor);

export default router;

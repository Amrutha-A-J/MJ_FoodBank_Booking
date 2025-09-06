import { Router } from 'express';
import { getSunshineBag, upsertSunshineBag } from '../controllers/sunshineBagController';
import { authMiddleware, authorizeAccess } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { addSunshineBagSchema } from '../schemas/sunshineBagSchemas';

const router = Router();

router.get('/', authMiddleware, authorizeAccess('pantry'), getSunshineBag);
router.post('/', authMiddleware, authorizeAccess('pantry'), validate(addSunshineBagSchema), upsertSunshineBag);

export default router;

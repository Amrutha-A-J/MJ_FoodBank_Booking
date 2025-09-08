import { Router } from 'express';
import { getAppConfig, updateAppConfig } from '../../controllers/admin/appConfigController';
import { authMiddleware, authorizeRoles, authorizeAccess } from '../../middleware/authMiddleware';
import { validate } from '../../middleware/validate';
import { appConfigSchema } from '../../schemas/admin/appConfigSchema';

const router = Router();

router.use(authMiddleware);
router.use(authorizeRoles('staff'));
router.get('/', authorizeAccess('admin', 'pantry'), getAppConfig);
router.put('/', authorizeAccess('admin'), validate(appConfigSchema), updateAppConfig);

export default router;

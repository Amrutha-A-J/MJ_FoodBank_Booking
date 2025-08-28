import { Router } from 'express';
import { getAppConfig, updateAppConfig } from '../../controllers/admin/appConfigController';
import { authMiddleware, authorizeRoles, authorizeAccess } from '../../middleware/authMiddleware';
import { validate } from '../../middleware/validate';
import { appConfigSchema } from '../../schemas/admin/appConfigSchema';

const router = Router();

router.use(authMiddleware);
router.use(authorizeRoles('staff'));
router.use(authorizeAccess('admin'));

router.get('/', getAppConfig);
router.put('/', validate(appConfigSchema), updateAppConfig);

export default router;

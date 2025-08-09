import { Router } from 'express';
import { listVolunteerMasterRoles, updateVolunteerMasterRole } from '../controllers/volunteerMasterRoleController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authMiddleware, authorizeRoles('staff'), listVolunteerMasterRoles);
router.patch('/:id', authMiddleware, authorizeRoles('staff'), updateVolunteerMasterRole);

export default router;

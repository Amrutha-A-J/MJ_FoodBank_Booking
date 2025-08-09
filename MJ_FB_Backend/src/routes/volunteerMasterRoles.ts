import { Router } from 'express';
import { listVolunteerMasterRoles } from '../controllers/volunteerMasterRoleController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authMiddleware, authorizeRoles('staff'), listVolunteerMasterRoles);

export default router;

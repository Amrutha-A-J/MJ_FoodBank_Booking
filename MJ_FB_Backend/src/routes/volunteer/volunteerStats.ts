import { Router } from 'express';
import { getGroupVolunteerStats } from '../../controllers/volunteer/volunteerStatsController';
import { authMiddleware, authorizeRoles } from '../../middleware/authMiddleware';

const router = Router();

router.get('/group', authMiddleware, authorizeRoles('volunteer', 'staff'), getGroupVolunteerStats);

export default router;

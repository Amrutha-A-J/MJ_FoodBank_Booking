import express from 'express';
import { getVolunteerLeaderboard } from '../../controllers/volunteer/volunteerStatsController';
import { authMiddleware, authorizeRoles } from '../../middleware/authMiddleware';

const router = express.Router();

router.get('/leaderboard', authMiddleware, authorizeRoles('volunteer'), getVolunteerLeaderboard);

export default router;


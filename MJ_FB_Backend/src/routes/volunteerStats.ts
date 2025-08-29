import express from 'express';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import { getVolunteerLeaderboard } from '../controllers/volunteer/volunteerStatsController';

const router = express.Router();

router.get('/leaderboard', authMiddleware, authorizeRoles('volunteer'), getVolunteerLeaderboard);

export default router;

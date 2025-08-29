import express from 'express';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import {
  getVolunteerLeaderboard,
  getVolunteerGroupStats,
} from '../controllers/volunteer/volunteerStatsController';

const router = express.Router();

router.get('/leaderboard', authMiddleware, authorizeRoles('volunteer'), getVolunteerLeaderboard);
router.get('/group', authMiddleware, authorizeRoles('volunteer'), getVolunteerGroupStats);

export default router;

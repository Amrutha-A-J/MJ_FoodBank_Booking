import express from 'express';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import {
  getVolunteerLeaderboard,
  getVolunteerGroupStats,
  getVolunteerNoShowRanking,
} from '../controllers/volunteer/volunteerStatsController';

const router = express.Router();

router.get('/leaderboard', authMiddleware, authorizeRoles('volunteer'), getVolunteerLeaderboard);
router.get('/group', authMiddleware, authorizeRoles('volunteer'), getVolunteerGroupStats);
router.get('/no-show-ranking', authMiddleware, authorizeRoles('staff'), getVolunteerNoShowRanking);

export default router;

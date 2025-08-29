import express from 'express';
import { getGroupVolunteerStats } from '../../controllers/volunteer/volunteerStatsController';
import { authMiddleware } from '../../middleware/authMiddleware';

const router = express.Router();

router.get('/group', authMiddleware, getGroupVolunteerStats);

export default router;

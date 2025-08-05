import express from 'express';
import { updateTrainedAreas, loginVolunteer } from '../controllers/volunteerController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/login', loginVolunteer);

router.put(
  '/:id/trained-areas',
  authMiddleware,
  authorizeRoles('staff', 'volunteer_coordinator'),
  updateTrainedAreas
);

export default router;

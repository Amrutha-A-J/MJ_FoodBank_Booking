import express from 'express';
import { updateTrainedAreas } from '../controllers/volunteerController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';

const router = express.Router();

router.put(
  '/:id/trained-areas',
  authMiddleware,
  authorizeRoles('staff', 'volunteer_coordinator'),
  updateTrainedAreas
);

export default router;

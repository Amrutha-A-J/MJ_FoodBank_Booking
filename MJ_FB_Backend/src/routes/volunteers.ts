import express from 'express';
import {
  updateTrainedArea,
  loginVolunteer,
  createVolunteer,
  searchVolunteers,
} from '../controllers/volunteerController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/login', loginVolunteer);

router.post(
  '/',
  authMiddleware,
  authorizeRoles('volunteer_coordinator'),
  createVolunteer
);

router.get(
  '/search',
  authMiddleware,
  authorizeRoles('staff', 'volunteer_coordinator'),
  searchVolunteers
);

router.put(
  '/:id/trained-areas',
  authMiddleware,
  authorizeRoles('staff', 'volunteer_coordinator'),
  updateTrainedArea
);

export default router;

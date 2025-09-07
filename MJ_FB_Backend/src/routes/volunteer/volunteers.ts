import express from 'express';
import {
  updateTrainedArea,
  loginVolunteer,
  getVolunteerProfile,
  createVolunteer,
  searchVolunteers,
  createVolunteerShopperProfile,
  removeVolunteerShopperProfile,
  getVolunteerStats,
  awardVolunteerBadge,
  deleteVolunteer,
} from '../../controllers/volunteer/volunteerController';
import { authMiddleware, authorizeRoles } from '../../middleware/authMiddleware';
import { validate } from '../../middleware/validate';
import { createVolunteerSchema } from '../../schemas/volunteer/volunteerSchemas';

const router = express.Router();

router.post('/login', loginVolunteer);

router.get('/me', authMiddleware, getVolunteerProfile);

router.get('/me/stats', authMiddleware, getVolunteerStats);

router.post('/me/badges', authMiddleware, awardVolunteerBadge);

router.post(
  '/',
  authMiddleware,
  authorizeRoles('staff'),
  validate(createVolunteerSchema),
  createVolunteer
);

router.get(
  '/search',
  authMiddleware,
  authorizeRoles('staff'),
  searchVolunteers
);

router.put(
  '/:id/trained-areas',
  authMiddleware,
  authorizeRoles('staff'),
  updateTrainedArea
);

router.post(
  '/:id/shopper',
  authMiddleware,
  authorizeRoles('staff'),
  createVolunteerShopperProfile
);

router.delete(
  '/:id/shopper',
  authMiddleware,
  authorizeRoles('staff'),
  removeVolunteerShopperProfile
);

router.delete(
  '/:id',
  authMiddleware,
  authorizeRoles('staff'),
  deleteVolunteer,
);

export default router;

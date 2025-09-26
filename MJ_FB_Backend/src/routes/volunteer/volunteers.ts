import express from 'express';
import {
  getVolunteerById,
  updateTrainedArea,
  getVolunteerProfile,
  createVolunteer,
  updateVolunteer,
  searchVolunteers,
  createVolunteerShopperProfile,
  removeVolunteerShopperProfile,
  getVolunteerStats,
  getVolunteerStatsById,
  awardVolunteerBadge,
  removeVolunteerBadge,
  deleteVolunteer,
} from '../../controllers/volunteer/volunteerController';
import { authMiddleware, authorizeRoles } from '../../middleware/authMiddleware';
import { validate } from '../../middleware/validate';
import { createVolunteerSchema, updateVolunteerSchema } from '../../schemas/volunteer/volunteerSchemas';

const router = express.Router();

router.get('/me', authMiddleware, getVolunteerProfile);

router.get('/me/stats', authMiddleware, getVolunteerStats);

router.get(
  '/:id/stats',
  authMiddleware,
  authorizeRoles('staff'),
  getVolunteerStatsById,
);

router.get(
  '/:id',
  authMiddleware,
  authorizeRoles('staff'),
  getVolunteerById,
);

router.post('/me/badges', authMiddleware, awardVolunteerBadge);
router.delete('/me/badges/:badgeCode', authMiddleware, removeVolunteerBadge);

router.post(
  '/',
  authMiddleware,
  authorizeRoles('staff'),
  validate(createVolunteerSchema),
  createVolunteer
);

router.put(
  '/:id',
  authMiddleware,
  authorizeRoles('staff'),
  validate(updateVolunteerSchema),
  updateVolunteer,
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

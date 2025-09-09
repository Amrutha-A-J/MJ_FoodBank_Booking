import express from 'express';
import {
  createUser,
  searchUsers,
  getUserProfile,
  getUserByClientId,
  listUsersMissingInfo,
  updateUserByClientId,
  updateMyProfile,
  deleteUserByClientId,
  getMyPreferences,
  updateMyPreferences,
} from '../controllers/userController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import {
  createUserSchema,
  updateUserSchema,
  updateMyProfileSchema,
  updatePreferencesSchema,
} from '../schemas/userSchemas';

const router = express.Router();
router.post(
  '/add-client',
  authMiddleware,
  authorizeRoles('staff'),
  validate(createUserSchema),
  createUser,
);
router.get('/search', authMiddleware, authorizeRoles('staff'), searchUsers);
router.get(
  '/id/:clientId',
  authMiddleware,
  authorizeRoles('staff'),
  getUserByClientId,
);
router.patch(
  '/id/:clientId',
  authMiddleware,
  authorizeRoles('staff'),
  validate(updateUserSchema),
  updateUserByClientId,
);
router.delete(
  '/id/:clientId',
  authMiddleware,
  authorizeRoles('staff'),
  deleteUserByClientId,
);
router.get(
  '/missing-info',
  authMiddleware,
  authorizeRoles('staff'),
  listUsersMissingInfo,
);
router.get('/me', authMiddleware, getUserProfile);
router.patch('/me', authMiddleware, validate(updateMyProfileSchema), updateMyProfile);
router.get('/me/preferences', authMiddleware, getMyPreferences);
router.put('/me/preferences', authMiddleware, validate(updatePreferencesSchema), updateMyPreferences);


export default router;

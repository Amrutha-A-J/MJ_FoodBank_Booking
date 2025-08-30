import express from 'express';
import {
  loginUser,
  createUser,
  searchUsers,
  getUserProfile,
  getUserByClientId,
  listUsersMissingInfo,
  updateUserByClientId,
  updateMyProfile,
} from '../controllers/userController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import {
  loginSchema,
  createUserSchema,
  updateUserSchema,
  updateMyProfileSchema,
} from '../schemas/userSchemas';

const router = express.Router();

router.post('/login', validate(loginSchema), loginUser);
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
router.get(
  '/missing-info',
  authMiddleware,
  authorizeRoles('staff'),
  listUsersMissingInfo,
);
router.get('/me', authMiddleware, getUserProfile);
router.patch('/me', authMiddleware, validate(updateMyProfileSchema), updateMyProfile);


export default router;

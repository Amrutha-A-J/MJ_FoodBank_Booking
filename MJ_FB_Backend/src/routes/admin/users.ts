import express from 'express';
import {
  loginUser,
  createUser,
  searchUsers,
  getUserProfile,
  getUserByClientId,
} from '../../controllers/admin/userController';
import { authMiddleware, authorizeRoles } from '../../middleware/authMiddleware';
import { validate } from '../../middleware/validate';
import { loginSchema, createUserSchema } from '../../schemas/userSchemas';

const router = express.Router();

router.post('/login', validate(loginSchema), loginUser);
router.post(
  '/',
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
router.get('/me', authMiddleware, getUserProfile);


export default router;

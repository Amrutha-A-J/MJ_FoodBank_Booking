import express from 'express';
import { loginUser, createUser, searchUsers, getUserProfile } from '../controllers/userController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import { loginSchema, createUserSchema } from '../schemas/userSchemas';

const router = express.Router();

router.post('/login', validate(loginSchema), loginUser);
router.post(
  '/',
  authMiddleware,
  authorizeRoles('staff', 'volunteer_coordinator'),
  validate(createUserSchema),
  createUser,
);
router.get('/search', authMiddleware, authorizeRoles('staff', 'volunteer_coordinator'), searchUsers);
router.get('/me', authMiddleware, getUserProfile);


export default router;

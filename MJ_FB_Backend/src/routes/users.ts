import express from 'express';
import { loginUser, createUser, searchUsers } from '../controllers/userController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/login', loginUser);
router.post(
  '/',
  authMiddleware,
  authorizeRoles('staff', 'volunteer_coordinator', 'admin'),
  createUser
);
router.get(
  '/search',
  authMiddleware,
  authorizeRoles('staff', 'volunteer_coordinator', 'admin'),
  searchUsers
);


export default router;

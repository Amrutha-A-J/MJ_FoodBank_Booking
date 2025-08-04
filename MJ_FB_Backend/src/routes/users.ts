import express from 'express';
import { loginUser, createUser, searchUsers } from '../controllers/userController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/login', loginUser);
router.post('/', authMiddleware, authorizeRoles('staff'), createUser);
router.get('/search', authMiddleware, authorizeRoles('staff'), searchUsers);


export default router;

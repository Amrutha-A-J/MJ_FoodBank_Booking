import express from 'express';
import { checkStaffExists, createAdmin, createStaff } from '../controllers/staffController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/exists', checkStaffExists);
router.post('/admin', createAdmin);
router.post('/', authMiddleware, authorizeRoles('admin'), createStaff);

export default router;

import express from 'express';
import { checkStaffExists, createAdmin, createStaff } from '../controllers/staffController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/exists', checkStaffExists);
router.post('/admin', createAdmin);
router.post('/', authMiddleware, createStaff);

export default router;

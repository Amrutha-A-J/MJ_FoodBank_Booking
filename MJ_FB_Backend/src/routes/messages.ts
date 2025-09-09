import express from 'express';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import { postMessage, getMessages } from '../controllers/messages';

const router = express.Router();

router.post('/', authMiddleware, authorizeRoles('volunteer', 'staff'), postMessage);
router.get('/', authMiddleware, authorizeRoles('volunteer', 'staff'), getMessages);

export default router;

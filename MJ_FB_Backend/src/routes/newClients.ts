import express from 'express';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import { getNewClients, deleteNewClient } from '../controllers/newClientController';

const router = express.Router();

router.get('/', authMiddleware, authorizeRoles('staff'), getNewClients);
router.delete('/:id', authMiddleware, authorizeRoles('staff'), deleteNewClient);

export default router;

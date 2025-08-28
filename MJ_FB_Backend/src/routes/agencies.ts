import { Router } from 'express';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import {
  addClientToAgency,
  removeClientFromAgency,
  getAgencyClients,
  createAgency,
} from '../controllers/agencyController';

const router = Router();

router.post('/', authMiddleware, authorizeRoles('staff'), createAgency);

router.get(
  '/:id/clients',
  authMiddleware,
  authorizeRoles('staff', 'agency'),
  getAgencyClients,
);

router.post(
  '/:id/clients',
  authMiddleware,
  authorizeRoles('staff', 'agency'),
  addClientToAgency,
);

router.delete(
  '/:id/clients/:clientId',
  authMiddleware,
  authorizeRoles('staff', 'agency'),
  removeClientFromAgency,
);

export default router;

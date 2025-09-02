import { Router } from 'express';
import {
  authMiddleware,
  authorizeRoles,
  authorizeAccess,
} from '../middleware/authMiddleware';
import {
  listRequests,
  createRequest,
  approveRequest,
  rejectRequest,
  cancelRequest,
} from '../controllers/leaveRequestController';

const router = Router();

router.use(authMiddleware);
router.use(authorizeRoles('staff'));

router.get('/', listRequests);
router.post('/', createRequest);
router.post('/:id/cancel', cancelRequest);
router.post('/:id/approve', authorizeAccess('admin'), approveRequest);
router.post('/:id/reject', authorizeAccess('admin'), rejectRequest);

export default router;

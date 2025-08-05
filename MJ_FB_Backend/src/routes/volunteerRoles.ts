import express from 'express';
import {
  addVolunteerRole,
  listVolunteerRoles,
  updateVolunteerRole,
  deleteVolunteerRole,
} from '../controllers/volunteerRoleController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authMiddleware, authorizeRoles('staff', 'volunteer_coordinator'));

router.post('/', addVolunteerRole);
router.get('/', listVolunteerRoles);
router.put('/:id', updateVolunteerRole);
router.delete('/:id', deleteVolunteerRole);

export default router;

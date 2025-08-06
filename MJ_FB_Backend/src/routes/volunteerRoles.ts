import express from 'express';
import {
  addVolunteerRole,
  listVolunteerRoles,
  updateVolunteerRole,
  deleteVolunteerRole,
  listVolunteerRolesForVolunteer,
} from '../controllers/volunteerRoleController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';
import { verifyVolunteerToken } from '../middleware/verifyVolunteerToken';

const router = express.Router();

router.get('/mine', verifyVolunteerToken, listVolunteerRolesForVolunteer);

router.use(authMiddleware, authorizeRoles('staff', 'volunteer_coordinator'));

router.post('/', addVolunteerRole);
router.get('/', listVolunteerRoles);
router.put('/:id', updateVolunteerRole);
router.delete('/:id', deleteVolunteerRole);

export default router;

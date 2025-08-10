import express from 'express';
import {
  addVolunteerRole,
  listVolunteerRoles,
  updateVolunteerRole,
  deleteVolunteerRole,
  listVolunteerRolesForVolunteer,
  updateVolunteerRoleStatus,
} from '../controllers/volunteerRoleController';
import { authMiddleware, authorizeRoles } from '../middleware/authMiddleware';

const router = express.Router();
router.get('/mine', authMiddleware, authorizeRoles('volunteer'), listVolunteerRolesForVolunteer);

router.use(authMiddleware, authorizeRoles('staff'));

router.post('/', addVolunteerRole);
router.get('/', listVolunteerRoles);
router.put('/:id', updateVolunteerRole);
router.patch('/:id', updateVolunteerRoleStatus);
router.delete('/:id', deleteVolunteerRole);

export default router;

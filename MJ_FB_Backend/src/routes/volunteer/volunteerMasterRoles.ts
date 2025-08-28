import { Router } from 'express';
import {
  listVolunteerMasterRoles,
  createVolunteerMasterRole,
  updateVolunteerMasterRole,
  deleteVolunteerMasterRole,
} from '../../controllers/volunteer/volunteerMasterRoleController';
import { authMiddleware, authorizeRoles } from '../../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware, authorizeRoles('staff'));

router.get('/', listVolunteerMasterRoles);
router.post('/', createVolunteerMasterRole);
router.put('/:id', updateVolunteerMasterRole);
router.delete('/:id', deleteVolunteerMasterRole);

export default router;

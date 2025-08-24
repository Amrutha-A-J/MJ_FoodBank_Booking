import express from 'express';
import {
  listStaff,
  searchStaff,
  getStaff,
  createStaff,
  updateStaff,
  deleteStaff,
} from '../controllers/adminStaffController';
import {
  authMiddleware,
  authorizeRoles as authorizeAccess,
} from '../middleware/authMiddleware';

const router = express.Router();

router.use(authMiddleware, authorizeAccess('admin'));

router.get('/', listStaff);
router.get('/search', searchStaff);
router.get('/:id', getStaff);
router.post('/', createStaff);
router.put('/:id', updateStaff);
router.delete('/:id', deleteStaff);

export default router;

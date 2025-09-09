import { Router } from 'express';
import { authMiddleware, authorizeAccess } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';
import {
  listDonors,
  addDonor,
  updateDonor,
  deleteDonor,
  getDonor,
  listDonations,
  addDonation,
  updateDonation,
  deleteDonation,
  getMailLists,
  sendMailLists,
} from '../controllers/monetaryDonorController';
import { addMonetaryDonorSchema, updateMonetaryDonorSchema } from '../schemas/monetaryDonorSchemas';
import { addMonetaryDonationSchema, updateMonetaryDonationSchema } from '../schemas/monetaryDonationSchemas';

const router = Router();

router.use(authMiddleware);
router.use(authorizeAccess('donor_management'));

router.get('/mail-lists', getMailLists);
router.post('/mail-lists/send', sendMailLists);

router.get('/', listDonors);
router.post('/', validate(addMonetaryDonorSchema), addDonor);
router.put('/:id', validate(updateMonetaryDonorSchema), updateDonor);
router.delete('/:id', deleteDonor);
router.get('/:id', getDonor);
router.get('/:id/donations', listDonations);
router.post('/:id/donations', validate(addMonetaryDonationSchema), addDonation);
router.put('/donations/:id', validate(updateMonetaryDonationSchema), updateDonation);
router.delete('/donations/:id', deleteDonation);

export default router;

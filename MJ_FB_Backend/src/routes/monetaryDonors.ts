import { Router } from 'express';
import multer from 'multer';
import { authMiddleware, authorizeAccess, authorizeStaffOrAccess } from '../middleware/authMiddleware';
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
  listTestEmails,
  addTestEmail,
  updateTestEmail,
  deleteTestEmail,
  sendTestMailLists,
  importZeffyDonations,
  getMonetaryDonorInsights,
} from '../controllers/monetaryDonorController';
import { addMonetaryDonorSchema, updateMonetaryDonorSchema } from '../schemas/monetaryDonorSchemas';
import { addMonetaryDonationSchema, updateMonetaryDonationSchema } from '../schemas/monetaryDonationSchemas';
import {
  addMonetaryDonorTestEmailSchema,
  updateMonetaryDonorTestEmailSchema,
} from '../schemas/monetaryDonorTestEmailSchemas';

const router = Router();
const upload = multer();

const staffOrDonorAccess = authorizeStaffOrAccess ?? authorizeAccess;

router.use(authMiddleware);

router.get('/insights', staffOrDonorAccess('donor_management'), getMonetaryDonorInsights);

router.use(authorizeAccess('donor_management'));

router.post('/import', upload.single('file'), importZeffyDonations);

router.get('/mail-lists', getMailLists);
router.post('/mail-lists/send', sendMailLists);
router.post('/mail-lists/test', sendTestMailLists);

router.get('/test-emails', listTestEmails);
router.post(
  '/test-emails',
  validate(addMonetaryDonorTestEmailSchema),
  addTestEmail,
);
router.put(
  '/test-emails/:id',
  validate(updateMonetaryDonorTestEmailSchema),
  updateTestEmail,
);
router.delete('/test-emails/:id', deleteTestEmail);

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

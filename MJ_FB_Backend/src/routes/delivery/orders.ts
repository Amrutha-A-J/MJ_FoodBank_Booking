import { Router } from 'express';
import {
  createDeliveryOrder,
  getDeliveryOrderHistory,
} from '../../controllers/deliveryOrderController';
import { authMiddleware, authorizeRoles } from '../../middleware/authMiddleware';
import { validate } from '../../middleware/validate';
import { createDeliveryOrderSchema } from '../../schemas/delivery/orderSchemas';

const router = Router();

router.use(authMiddleware);

router.post(
  '/',
  authorizeRoles('delivery', 'staff'),
  validate(createDeliveryOrderSchema),
  createDeliveryOrder,
);

router.get('/history', authorizeRoles('delivery', 'staff'), getDeliveryOrderHistory);

export default router;

import { Router } from 'express';
import {
  createDeliveryOrder,
  cancelDeliveryOrder,
  getDeliveryOrderHistory,
  listOutstandingDeliveryOrders,
  completeDeliveryOrder,
} from '../../controllers/deliveryOrderController';
import { authMiddleware, authorizeRoles } from '../../middleware/authMiddleware';
import { validate } from '../../middleware/validate';
import {
  createDeliveryOrderSchema,
  completeDeliveryOrderSchema,
} from '../../schemas/delivery/orderSchemas';

const router = Router();

router.use(authMiddleware);

router.post(
  '/',
  authorizeRoles('delivery', 'staff'),
  validate(createDeliveryOrderSchema),
  createDeliveryOrder,
);

router.get('/', authorizeRoles('delivery', 'staff'), getDeliveryOrderHistory);
router.get('/history', authorizeRoles('delivery', 'staff'), getDeliveryOrderHistory);
router.get(
  '/outstanding',
  authorizeRoles('staff'),
  listOutstandingDeliveryOrders,
);
router.post(
  '/:id/complete',
  authorizeRoles('staff'),
  validate(completeDeliveryOrderSchema),
  completeDeliveryOrder,
);
router.post('/:id/cancel', authorizeRoles('delivery', 'staff'), cancelDeliveryOrder);

export default router;

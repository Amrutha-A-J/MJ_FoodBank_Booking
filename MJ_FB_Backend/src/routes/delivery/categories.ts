import { Router } from 'express';
import {
  listDeliveryCategories,
  createDeliveryCategory,
  updateDeliveryCategory,
  deleteDeliveryCategory,
  createDeliveryItem,
  updateDeliveryItem,
  deleteDeliveryItem,
} from '../../controllers/deliveryCategoryController';
import { authMiddleware, authorizeRoles } from '../../middleware/authMiddleware';
import { validate } from '../../middleware/validate';
import {
  createDeliveryCategorySchema,
  updateDeliveryCategorySchema,
  createDeliveryItemSchema,
  updateDeliveryItemSchema,
} from '../../schemas/delivery/categorySchemas';

const router = Router();

router.use(authMiddleware);
router.use(authorizeRoles('staff'));

router.get('/', listDeliveryCategories);
router.post('/', validate(createDeliveryCategorySchema), createDeliveryCategory);
router.put('/:id', validate(updateDeliveryCategorySchema), updateDeliveryCategory);
router.delete('/:id', deleteDeliveryCategory);
router.post(
  '/:categoryId/items',
  validate(createDeliveryItemSchema),
  createDeliveryItem,
);
router.put(
  '/:categoryId/items/:itemId',
  validate(updateDeliveryItemSchema),
  updateDeliveryItem,
);
router.delete('/:categoryId/items/:itemId', deleteDeliveryItem);

export default router;

import { z } from 'zod';

export const deliveryOrderSelectionSchema = z.object({
  itemId: z.coerce
    .number()
    .finite('itemId must be a number')
    .int('itemId must be an integer')
    .positive('itemId must be positive'),
  quantity: z.coerce
    .number()
    .finite('quantity must be a number')
    .int('quantity must be an integer')
    .min(1, 'quantity must be at least 1'),
});

const nonEmptyString = (field: string) => z.string().trim().min(1, `${field} is required`);

export const createDeliveryOrderSchema = z.object({
  clientId: z.coerce
    .number()
    .finite('clientId must be a number')
    .int('clientId must be an integer')
    .positive('clientId must be positive'),
  address: nonEmptyString('Address'),
  phone: nonEmptyString('Phone'),
  email: z.string().trim().email('A valid email address is required'),
  selections: z.array(deliveryOrderSelectionSchema).default([]),
});

export type DeliveryOrderSelectionInput = z.infer<typeof deliveryOrderSelectionSchema>;
export type CreateDeliveryOrderInput = z.infer<typeof createDeliveryOrderSchema>;

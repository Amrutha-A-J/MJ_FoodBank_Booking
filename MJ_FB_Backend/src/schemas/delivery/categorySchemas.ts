import { z } from 'zod';

const nameSchema = z.string().trim().min(1, 'Name is required');

export const createDeliveryCategorySchema = z.object({
  name: nameSchema,
  maxItems: z.coerce
    .number({ invalid_type_error: 'maxItems must be a number' })
    .int('maxItems must be an integer')
    .min(0, 'maxItems must be 0 or greater'),
});

export const updateDeliveryCategorySchema = createDeliveryCategorySchema;

export const createDeliveryItemSchema = z.object({
  name: nameSchema,
  isActive: z.coerce.boolean().optional().default(true),
});

export const updateDeliveryItemSchema = z
  .object({
    name: nameSchema.optional(),
    isActive: z.coerce.boolean().optional(),
  })
  .refine(data => data.name !== undefined || data.isActive !== undefined, {
    message: 'At least one field must be provided',
    path: [],
  });

export type CreateDeliveryCategoryInput = z.infer<typeof createDeliveryCategorySchema>;
export type UpdateDeliveryCategoryInput = z.infer<typeof updateDeliveryCategorySchema>;
export type CreateDeliveryItemInput = z.infer<typeof createDeliveryItemSchema>;
export type UpdateDeliveryItemInput = z.infer<typeof updateDeliveryItemSchema>;

import { z } from 'zod';

export const slotSchema = z.object({
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  maxCapacity: z.coerce.number().int().positive(),
});

export const slotIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const slotCapacitySchema = z.object({
  maxCapacity: z.coerce.number().int().nonnegative(),
});

export type SlotInput = z.infer<typeof slotSchema>;
export type SlotIdParams = z.infer<typeof slotIdParamSchema>;
export type SlotCapacityInput = z.infer<typeof slotCapacitySchema>;


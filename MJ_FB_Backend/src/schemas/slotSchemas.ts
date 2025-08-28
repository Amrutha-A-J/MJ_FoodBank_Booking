import { z } from 'zod';

export const slotSchema = z.object({
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  maxCapacity: z.coerce.number().int().positive(),
});

export const slotIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type SlotInput = z.infer<typeof slotSchema>;
export type SlotIdParams = z.infer<typeof slotIdParamSchema>;

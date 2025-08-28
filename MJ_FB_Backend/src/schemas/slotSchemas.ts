import { z } from 'zod';

export const createSlotSchema = z.object({
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  maxCapacity: z.coerce.number().int().positive(),
});

export const updateSlotSchema = createSlotSchema;

export const slotIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreateSlotInput = z.infer<typeof createSlotSchema>;
export type UpdateSlotInput = z.infer<typeof updateSlotSchema>;
export type SlotIdParams = z.infer<typeof slotIdParamSchema>;

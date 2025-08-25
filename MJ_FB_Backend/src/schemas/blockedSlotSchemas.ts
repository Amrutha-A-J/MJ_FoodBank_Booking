import { z } from 'zod';

export const addBlockedSlotSchema = z.object({
  date: z.string().min(1),
  slotId: z.coerce.number().int().positive(),
  reason: z.string().optional(),
});

export const deleteBlockedSlotParamsSchema = z.object({
  date: z.string().min(1),
  slotId: z.coerce.number().int().positive(),
});

export type AddBlockedSlotInput = z.infer<typeof addBlockedSlotSchema>;
export type DeleteBlockedSlotParams = z.infer<typeof deleteBlockedSlotParamsSchema>;

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

export const addRecurringBlockedSlotSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  weekOfMonth: z.coerce.number().int().min(1).max(5),
  slotId: z.coerce.number().int().positive(),
  reason: z.string().optional(),
});

export const deleteRecurringBlockedSlotParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type AddRecurringBlockedSlotInput = z.infer<
  typeof addRecurringBlockedSlotSchema
>;
export type DeleteRecurringBlockedSlotParams = z.infer<
  typeof deleteRecurringBlockedSlotParamsSchema
>;

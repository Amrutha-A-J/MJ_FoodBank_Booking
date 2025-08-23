import { z } from 'zod';

export const surplusSchema = z.object({
  date: z.string().min(1),
  type: z.enum(['BREAD', 'CANS']),
  count: z.number().int(),
});

export const addSurplusSchema = surplusSchema;
export const updateSurplusSchema = surplusSchema;

export type SurplusSchema = z.infer<typeof surplusSchema>;

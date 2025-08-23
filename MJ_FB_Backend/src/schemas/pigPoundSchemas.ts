import { z } from 'zod';

export const pigPoundSchema = z.object({
  date: z.string().min(1),
  weight: z.number().int(),
});

export const addPigPoundSchema = pigPoundSchema;
export const updatePigPoundSchema = pigPoundSchema;

export type PigPoundSchema = z.infer<typeof pigPoundSchema>;

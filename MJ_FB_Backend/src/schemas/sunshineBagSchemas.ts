import { z } from 'zod';

export const sunshineBagSchema = z.object({
  date: z.string().min(1),
  weight: z.number().int(),
});

export const addSunshineBagSchema = sunshineBagSchema;

export type SunshineBagSchema = z.infer<typeof sunshineBagSchema>;

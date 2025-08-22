import { z } from 'zod';

export const addDonorSchema = z.object({
  name: z.string().min(1),
});

export type AddDonorSchema = z.infer<typeof addDonorSchema>;

import { z } from 'zod';

export const addDonorSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
});

export type AddDonorSchema = z.infer<typeof addDonorSchema>;

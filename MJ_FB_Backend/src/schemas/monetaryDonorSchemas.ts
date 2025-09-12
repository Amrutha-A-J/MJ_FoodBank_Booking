import { z } from 'zod';

export const monetaryDonorSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().nullable(),
});

export const addMonetaryDonorSchema = monetaryDonorSchema;
export const updateMonetaryDonorSchema = monetaryDonorSchema;

export type MonetaryDonorSchema = z.infer<typeof monetaryDonorSchema>;

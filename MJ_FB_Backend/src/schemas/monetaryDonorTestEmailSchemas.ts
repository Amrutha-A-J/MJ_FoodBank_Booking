import { z } from 'zod';

export const monetaryDonorTestEmailSchema = z.object({
  email: z.string().email(),
});

export const addMonetaryDonorTestEmailSchema = monetaryDonorTestEmailSchema;
export const updateMonetaryDonorTestEmailSchema = monetaryDonorTestEmailSchema;

export type MonetaryDonorTestEmailSchema = z.infer<typeof monetaryDonorTestEmailSchema>;
